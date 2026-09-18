/**
 * Dispatcher d'effets de bord de la machine à états — cahier des charges §5.
 *
 * Appelé par le code appelant (route API, hors périmètre de ce fichier)
 * APRÈS que `transition()` (voir `transitions.ts`) a committé son propre
 * changement de statut + ligne d'historique. Ces effets s'exécutent donc
 * DÉLIBÉRÉMENT hors de toute transaction DB portant sur la transition
 * elle-même : e-mail (SMTP) et Google Agenda peuvent être lents, et il ne
 * faut jamais bloquer une transaction Postgres dessus.
 *
 * Chaque handler recharge lui-même les données dont il a besoin via `prisma`
 * (jamais de `tx` hérité de l'appelant). Quand un handler doit écrire
 * plusieurs lignes de façon atomique, il utilise `prisma.$transaction`.
 */

import type { ReservationStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { transition, type PrismaTransactionClient } from "./transitions";
import { generateNumero } from "../numbering";
import { sendMail } from "../email/mailer";
import { demandeRecueEmail, devisEnvoyeEmail, factureEnvoyeeEmail } from "../email/templates";
import { renderDevisPdf } from "../pdf/devisPdf";
import { renderFacturePdf } from "../pdf/facturePdf";
import { createOrUpdateEvent, deleteEvent } from "../google/calendarSync";
import { promises as fs } from "fs";
import path from "path";

type EffectHandler = (reservationId: string) => Promise<void>;

/**
 * DEMANDE_RECUE (statut 1) : envoie l'e-mail d'accusé de réception.
 *
 * NB — hors périmètre de ce dispatcher : le passage du `Creneau` lié à
 * `RESERVE`, ainsi que l'enchaînement automatique vers
 * `DEVIS_INTERNE_GENERE`, sont effectués par la route API de création de
 * réservation elle-même, DANS LA MÊME transaction DB que l'insertion de la
 * `Reservation` (en appelant `transition()` directement). Ce fichier n'étant
 * invoqué qu'APRÈS commit, il ne doit surtout pas dupliquer cette logique ici
 * — le prochain ingénieur ne doit pas ajouter de mise à jour de `Creneau`
 * dans ce handler.
 */
async function handleDemandeRecue(reservationId: string): Promise<void> {
  const reservation = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservationId },
  });

  const { subject, html } = demandeRecueEmail({
    nomOuRaisonSociale: reservation.nomOuRaisonSociale,
  });

  await sendMail({ to: reservation.email, subject, html });
}

/*
 * DEVIS_INTERNE_GENERE (statut 2) : PAS de handler ici, volontairement.
 *
 * C'est également la route API de création de réservation qui, dans la même
 * transaction DB que l'insertion de la `Reservation` :
 *   1. calcule le tarif via `calculerTarif()` (src/lib/pricing/pricingEngine.ts),
 *      en construisant l'input à partir de la config de la `Visite` + des
 *      `RegleForfait` actives, avec `dateEvenement = Creneau.dateHeure` et
 *      `dateReservation = Reservation.createdAt` ;
 *   2. crée la ligne `Devis` correspondante, avec `numero` obtenu via
 *      `generateNumero('DEVIS', tx)` (voir numbering.ts) ;
 *   3. transitionne vers `EN_ATTENTE_VALIDATION_ADMIN` via `transition()`.
 * Ce dispatcher n'a donc rien à faire pour ce statut — ne pas ajouter
 * d'entrée dans la table `EFFECTS` ci-dessous pour `DEVIS_INTERNE_GENERE`.
 */

/**
 * DEVIS_ENVOYE (statut 5) : génère le PDF du devis, l'enregistre sous
 * `public/uploads/devis/<numero>.pdf`, envoie l'e-mail avec le PDF en pièce
 * jointe, fixe la date limite de règlement de l'acompte, puis enchaîne
 * automatiquement vers ACOMPTE_EN_ATTENTE.
 */
async function handleDevisEnvoye(reservationId: string): Promise<void> {
  const reservation = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservationId },
    include: { devis: true },
  });

  if (!reservation.devis) {
    throw new Error(`DEVIS_ENVOYE : aucun devis lié à la réservation ${reservationId}`);
  }

  const devis = await prisma.devis.findUniqueOrThrow({
    where: { id: reservation.devis.id },
    include: { reservation: true, client: true },
  });

  const pdfBuffer = await renderDevisPdf(devis);

  const dir = path.join(process.cwd(), "public", "uploads", "devis");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${devis.numero}.pdf`), pdfBuffer);
  const pdfUrl = `/uploads/devis/${devis.numero}.pdf`;

  const acompteDateLimite = new Date();
  acompteDateLimite.setDate(acompteDateLimite.getDate() + devis.acompteDelaiJours);

  const updatedDevis = await prisma.devis.update({
    where: { id: devis.id },
    data: {
      pdfUrl,
      envoyeLe: new Date(),
      acompteDateLimite,
    },
  });

  const { subject, html } = devisEnvoyeEmail(
    {
      numero: updatedDevis.numero,
      montantTotal: updatedDevis.montantTotal,
      acomptePourcentage: updatedDevis.acomptePourcentage,
      acompteMontant: updatedDevis.acompteMontant,
      acompteDateLimite: updatedDevis.acompteDateLimite,
    },
    { nomOuRaisonSociale: reservation.nomOuRaisonSociale }
  );

  await sendMail({
    to: reservation.email,
    subject,
    html,
    attachments: [{ filename: `${updatedDevis.numero}.pdf`, content: pdfBuffer }],
  });

  // Auto-transition, dans sa propre petite transaction (update + ligne d'historique).
  await prisma.$transaction((tx: PrismaTransactionClient) =>
    transition(tx, reservationId, "ACOMPTE_EN_ATTENTE", {
      changedBy: null,
      note: "Auto: acompte en attente",
    })
  );
}

/**
 * CONFIRME (statut 8) : crée/met à jour l'événement Google Agenda
 * (no-op si la sync est désactivée) et stocke l'id retourné sur la réservation.
 */
async function handleConfirme(reservationId: string): Promise<void> {
  const reservation = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservationId },
    include: { creneau: { include: { visite: true } } },
  });

  const eventId = await createOrUpdateEvent({
    reservation: {
      nomOuRaisonSociale: reservation.nomOuRaisonSociale,
      telephone: reservation.telephone,
      email: reservation.email,
      adressePostale: reservation.adressePostale,
      nbAdultes: reservation.nbAdultes,
      nbEnfants: reservation.nbEnfants,
    },
    creneau: { dateHeure: reservation.creneau.dateHeure },
    visite: { nom: reservation.creneau.visite.nom },
    existingEventId: reservation.googleEventId,
  });

  if (eventId && eventId !== reservation.googleEventId) {
    await prisma.reservation.update({
      where: { id: reservationId },
      data: { googleEventId: eventId },
    });
  }
}

/**
 * REALISE (statut 9) : génère automatiquement la `Facture` à partir du
 * `Devis` lié (copie nb personnes/montant/taux TVA).
 */
async function handleRealise(reservationId: string): Promise<void> {
  const reservation = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservationId },
    include: { devis: true },
  });

  if (!reservation.devis) {
    throw new Error(
      `REALISE : aucun devis lié à la réservation ${reservationId}, impossible de générer la facture`
    );
  }

  const devis = reservation.devis;

  await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const numero = await generateNumero("FACTURE", tx);
    await tx.facture.create({
      data: {
        numero,
        devisId: devis.id,
        clientId: devis.clientId,
        nbAdultesReel: devis.nbAdultes,
        nbEnfantsReel: devis.nbEnfants,
        montantFinal: devis.montantTotal,
        tauxTVA: devis.tauxTVA,
      },
    });
  });
}

/**
 * FACTURE_ENVOYEE (statut 11) : génère le PDF de la facture, l'enregistre
 * sous `public/uploads/factures/<numero>.pdf`, envoie l'e-mail avec le PDF
 * en pièce jointe.
 */
async function handleFactureEnvoyee(reservationId: string): Promise<void> {
  const reservation = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservationId },
    include: { devis: { include: { facture: true } } },
  });

  const factureRef = reservation.devis?.facture;
  if (!factureRef) {
    throw new Error(`FACTURE_ENVOYEE : aucune facture liée à la réservation ${reservationId}`);
  }

  const facture = await prisma.facture.findUniqueOrThrow({
    where: { id: factureRef.id },
    include: { devis: { include: { reservation: true, client: true } }, client: true },
  });

  const pdfBuffer = await renderFacturePdf(facture);

  const dir = path.join(process.cwd(), "public", "uploads", "factures");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${facture.numero}.pdf`), pdfBuffer);
  const pdfUrl = `/uploads/factures/${facture.numero}.pdf`;

  const updatedFacture = await prisma.facture.update({
    where: { id: facture.id },
    data: { pdfUrl, envoyeeLe: new Date() },
  });

  const { subject, html } = factureEnvoyeeEmail(
    { numero: updatedFacture.numero, montantFinal: updatedFacture.montantFinal },
    { nomOuRaisonSociale: reservation.nomOuRaisonSociale }
  );

  await sendMail({
    to: reservation.email,
    subject,
    html,
    attachments: [{ filename: `${updatedFacture.numero}.pdf`, content: pdfBuffer }],
  });
}

/**
 * ANNULE (branche annulation) : masque le créneau (jamais republié
 * automatiquement — republication manuelle par l'admin, cf. cahier des
 * charges §5.2), signale un éventuel remboursement d'acompte à traiter
 * manuellement, et supprime l'événement Google Agenda le cas échéant.
 */
async function handleAnnule(reservationId: string): Promise<void> {
  const reservation = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservationId },
    include: { devis: true, creneau: true },
  });

  await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    if (reservation.devis?.acompteStatutPaiement === "RECU") {
      const montant = reservation.devis.acompteMontant.toString();
      const note = `Remboursement acompte à traiter manuellement (${montant} €).`;
      const notesAdmin = reservation.notesAdmin ? `${reservation.notesAdmin}\n${note}` : note;

      await tx.reservation.update({
        where: { id: reservationId },
        data: { notesAdmin },
      });
    }

    await tx.creneau.update({
      where: { id: reservation.creneauId },
      data: { status: "MASQUE" },
    });
  });

  if (reservation.googleEventId) {
    await deleteEvent(reservation.googleEventId);
  }
}

/**
 * Statuts sans effet de bord automatique à ce jour :
 * - `EN_ATTENTE_VALIDATION_ADMIN`, `DEVIS_VALIDE` : actions manuelles admin uniquement.
 * - `ACOMPTE_EN_ATTENTE` : atteint automatiquement par `handleDevisEnvoye` ci-dessus, rien de plus à faire ici.
 * - `ACOMPTE_RECU` : le pointage du règlement est une action manuelle admin (formulaire back-office).
 * - `ACOMPTE_EXPIRE` : l'e-mail correspondant (`acompteExpireEmail`) est envoyé par le job planifié
 *   (`cron/acompte-expire`, hors périmètre de ce fichier), qui détecte les devis dont
 *   `acompteDateLimite` est dépassée et transitionne lui-même vers ce statut — pas de handler ici.
 * - `FACTURE_AJUSTEE` : action manuelle admin (ajustement du montant/nb personnes), pas d'e-mail auto à ce stade.
 * - `SOLDE` : le pointage du règlement du solde est une action manuelle admin.
 */
const EFFECTS: Partial<Record<ReservationStatus, EffectHandler>> = {
  DEMANDE_RECUE: handleDemandeRecue,
  DEVIS_ENVOYE: handleDevisEnvoye,
  CONFIRME: handleConfirme,
  REALISE: handleRealise,
  FACTURE_ENVOYEE: handleFactureEnvoyee,
  ANNULE: handleAnnule,
};

/**
 * Point d'entrée du dispatcher — à appeler APRÈS commit de `transition()`,
 * jamais à l'intérieur de la transaction DB qui a changé le statut.
 */
export async function applyEffects(reservationId: string, toStatus: ReservationStatus): Promise<void> {
  const handler = EFFECTS[toStatus];
  if (!handler) {
    return;
  }
  await handler(reservationId);
}
