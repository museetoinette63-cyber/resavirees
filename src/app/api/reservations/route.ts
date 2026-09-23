import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reservationSchema } from "@/lib/validation/reservationSchema";
import {
  transition,
  type PrismaTransactionClient,
} from "@/lib/reservationWorkflow/transitions";
import { applyEffects } from "@/lib/reservationWorkflow/effects";
import { generateNumero } from "@/lib/numbering";
import {
  calculerTarif,
  type ForfaitNiveau1Config,
  type ForfaitNiveau2Config,
} from "@/lib/pricing/pricingEngine";
import { toCents, fromCents } from "@/lib/pricing/money";

/** Levée quand le créneau demandé n'est plus PUBLIE (déjà réservé entre-temps). */
class SlotUnavailableError extends Error {
  constructor() {
    super("Ce créneau n'est plus disponible.");
    this.name = "SlotUnavailableError";
  }
}

/**
 * POST /api/reservations — crée une demande de réservation publique.
 *
 * Cahier des charges : dans une seule transaction DB, on (1) verrouille le
 * créneau en le faisant passer PUBLIE -> RESERVE de façon atomique (protège
 * contre une double réservation concurrente du même créneau), (2) crée le
 * Client (upsert par e-mail) et la Reservation liée (statut initial
 * DEMANDE_RECUE par défaut du schéma — cet état n'a pas de transition
 * entrante dans TRANSITIONS puisqu'il est le point de départ de la machine),
 * (3) enchaîne automatiquement DEMANDE_RECUE -> DEVIS_INTERNE_GENERE puis,
 * après calcul du tarif et création du Devis, -> EN_ATTENTE_VALIDATION_ADMIN
 * (voir les commentaires de src/lib/reservationWorkflow/effects.ts qui
 * décrivent précisément ce que cette route doit faire). Après commit, on
 * déclenche l'effet DEMANDE_RECUE (e-mail d'accusé de réception) hors
 * transaction.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête JSON invalide." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const { creneauId, ...formFields } = body as Record<string, unknown>;

  if (typeof creneauId !== "string" || creneauId.length === 0) {
    return NextResponse.json({ error: "creneauId manquant ou invalide." }, { status: 400 });
  }

  const parsed = reservationSchema.safeParse(formFields);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données de réservation invalides.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  try {
    const reservation = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      // Verrouillage atomique : ne réussit que si le créneau est toujours
      // PUBLIE au moment de l'exécution de l'UPDATE (Postgres sérialise les
      // écritures concurrentes sur la même ligne sous READ COMMITTED — la
      // seconde transaction concurrente verra `count === 0` une fois la
      // première committée).
      const creneauUpdate = await tx.creneau.updateMany({
        where: { id: creneauId, status: "PUBLIE" },
        data: { status: "RESERVE" },
      });
      if (creneauUpdate.count === 0) {
        throw new SlotUnavailableError();
      }

      const creneau = await tx.creneau.findUniqueOrThrow({ where: { id: creneauId } });

      const client = await tx.client.upsert({
        where: { email: data.email },
        create: {
          email: data.email,
          nomOuRaisonSociale: data.nomOuRaisonSociale,
          telephone: data.telephone,
          adressePostale: data.adressePostale,
        },
        update: {},
      });

      const newReservation = await tx.reservation.create({
        data: {
          creneauId: creneau.id,
          clientId: client.id,
          nomOuRaisonSociale: data.nomOuRaisonSociale,
          telephone: data.telephone,
          email: data.email,
          adressePostale: data.adressePostale,
          nbAdultes: data.nbAdultes,
          nbEnfants: data.nbEnfants,
        },
      });

      // DEMANDE_RECUE est déjà le statut par défaut posé par la création
      // ci-dessus : on enchaîne directement vers DEVIS_INTERNE_GENERE.
      await transition(tx, newReservation.id, "DEVIS_INTERNE_GENERE", { changedBy: null });

      const visite = await tx.visite.findUniqueOrThrow({
        where: { id: creneau.visiteId },
        include: { reglesForfait: { where: { actif: true } } },
      });

      const regleNiveau1 = visite.reglesForfait.find((r) => r.niveau === "NIVEAU_1");
      const forfait1: ForfaitNiveau1Config | null =
        regleNiveau1 && regleNiveau1.seuilAdultes != null && regleNiveau1.seuilEnfants != null
          ? {
              seuilAdultes: regleNiveau1.seuilAdultes,
              seuilEnfants: regleNiveau1.seuilEnfants,
              montant: toCents(regleNiveau1.montant),
              actif: regleNiveau1.actif,
            }
          : null;

      const regleNiveau2 = visite.reglesForfait.find((r) => r.niveau === "NIVEAU_2");
      const forfait2: ForfaitNiveau2Config | null =
        regleNiveau2 && regleNiveau2.seuilGlobal != null
          ? {
              seuilGlobal: regleNiveau2.seuilGlobal,
              montant: toCents(regleNiveau2.montant),
              actif: regleNiveau2.actif,
            }
          : null;

      const pricing = calculerTarif({
        nbAdultes: data.nbAdultes,
        nbEnfants: data.nbEnfants,
        tarifAdulte: toCents(visite.tarifAdulte),
        tarifEnfant: toCents(visite.tarifEnfant),
        forfait1,
        forfait2,
        majorationTardiveMontant: toCents(visite.majorationTardiveMontant),
        majorationTardiveDelaiHeures: visite.majorationTardiveDelaiHeures,
        dateReservation: newReservation.dateReservation,
        dateEvenement: creneau.dateHeure,
      });

      const acomptePourcentageNum = visite.acomptePourcentage.toNumber();
      const acompteMontantCents = Math.round((pricing.montantTotal * acomptePourcentageNum) / 100);

      const numero = await generateNumero("DEVIS", tx);

      // Ligne de devis unique représentant la visite réservée. Le moteur de
      // tarification (forfaits de groupe, majoration tardive...) ne produit
      // qu'un montant total, pas un prix par personne cohérent avec ce
      // total — on dérive donc ici un `prixUnitaire` "moyen" (montantTotal /
      // nb de personnes) uniquement pour que la ligne s'affiche de façon
      // lisible sur le PDF ; `montantLigne` reste le vrai montant total du
      // devis, donc la ligne (et par construction le devis) reste toujours
      // exacte même si ce prix unitaire est une simplification arithmétique.
      const quantiteLigne = data.nbAdultes + data.nbEnfants; // >= 1, garanti par reservationSchema
      const montantTotalDecimal = fromCents(pricing.montantTotal);
      const prixUnitaireLigne = montantTotalDecimal.dividedBy(quantiteLigne);

      const produitCorrespondant = await tx.produit.findFirst({
        where: { visiteId: visite.id, actif: true },
      });

      await tx.devis.create({
        data: {
          numero,
          reservationId: newReservation.id,
          clientId: client.id,
          origineManuelle: false,
          nbAdultes: data.nbAdultes,
          nbEnfants: data.nbEnfants,
          tarifAdulteApplique: visite.tarifAdulte,
          tarifEnfantApplique: visite.tarifEnfant,
          forfaitApplique: pricing.forfaitApplique,
          montantForfait: pricing.montantForfait !== null ? fromCents(pricing.montantForfait) : null,
          coutIndividuelTotal: fromCents(pricing.coutIndividuelTotal),
          montantAvantMajoration: fromCents(pricing.montantAvantMajoration),
          majorationTardiveAppliquee: pricing.majorationTardiveAppliquee,
          montantMajoration: fromCents(pricing.montantMajoration),
          montantTotal: montantTotalDecimal,
          tauxTVA: 0,
          acomptePourcentage: visite.acomptePourcentage,
          acompteMontant: fromCents(acompteMontantCents),
          acompteDelaiJours: visite.acompteDelaiJours,
          dateEvenement: creneau.dateHeure,
          dureeMinutes: produitCorrespondant?.dureeMinutes ?? null,
          lignes: {
            create: {
              produitId: produitCorrespondant?.id ?? null,
              denomination: visite.nom,
              quantite: quantiteLigne,
              prixUnitaire: prixUnitaireLigne,
              montantLigne: montantTotalDecimal,
              ordre: 0,
            },
          },
        },
      });

      await transition(tx, newReservation.id, "EN_ATTENTE_VALIDATION_ADMIN", { changedBy: null });

      return newReservation;
    });

    // Effet de bord (e-mail d'accusé de réception) déclenché après commit,
    // jamais dans la transaction. Une panne d'envoi ne doit pas faire
    // échouer la réponse HTTP.
    try {
      await applyEffects(reservation.id, "DEMANDE_RECUE");
    } catch (err) {
      console.error("[api/reservations] échec de applyEffects(DEMANDE_RECUE) :", err);
    }

    return NextResponse.json({ reservationId: reservation.id }, { status: 201 });
  } catch (err) {
    if (err instanceof SlotUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("[api/reservations] échec de la création de réservation :", err);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la création de la réservation." },
      { status: 500 }
    );
  }
}
