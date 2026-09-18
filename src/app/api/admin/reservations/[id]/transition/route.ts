import { NextResponse } from "next/server";
import type { ReservationStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  transition,
  InvalidTransitionError,
  type PrismaTransactionClient,
} from "@/lib/reservationWorkflow/transitions";
import { applyEffects } from "@/lib/reservationWorkflow/effects";

/**
 * Endpoint unique et générique pour toutes les transitions de statut
 * déclenchées manuellement par l'admin sur l'écran de détail d'une
 * réservation (`admin/(shell)/reservations/[id]`). Body :
 * `{ to: ReservationStatus, note?: string, extra?: {...} }`.
 *
 * Le `switch(to)` ci-dessous gère les mises à jour de champs annexes
 * (règlement acompte/solde, ajustement facture, validation devis) DANS LA
 * MÊME transaction Prisma que l'appel à `transition()` (qui vérifie la table
 * `TRANSITIONS` et écrit la ligne d'historique) — cf. cahier des charges :
 * le pointage d'un règlement doit être atomique avec le changement de statut
 * qu'il déclenche. `applyEffects()` (e-mail/PDF/Google Agenda) est appelé
 * séparément APRÈS commit, comme l'exige `effects.ts`.
 */

interface ExtraPayload {
  acompteDateReglement?: string;
  acompteReferenceReglement?: string;
  soldeDateReglement?: string;
  soldeReferenceReglement?: string;
  nbAdultesReel?: number;
  nbEnfantsReel?: number;
  montantFinal?: number;
}

interface TransitionRequestBody {
  to?: ReservationStatus;
  note?: string;
  extra?: ExtraPayload;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as TransitionRequestBody | null;

  if (!body?.to) {
    return NextResponse.json({ error: "Le champ 'to' est requis." }, { status: 400 });
  }

  const { to, note, extra } = body;
  const changedBy = session.user.email ?? null;

  try {
    await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      const reservation = await tx.reservation.findUniqueOrThrow({
        where: { id },
        include: { devis: { include: { facture: true } } },
      });

      switch (to) {
        case "DEVIS_VALIDE": {
          await transition(tx, id, "DEVIS_VALIDE", { changedBy, note });
          if (reservation.devis) {
            await tx.devis.update({
              where: { id: reservation.devis.id },
              data: { validePar: changedBy, valideLe: new Date() },
            });
          }
          break;
        }

        case "DEVIS_ENVOYE": {
          await transition(tx, id, "DEVIS_ENVOYE", { changedBy, note });
          break;
        }

        case "CONFIRME": {
          // "Pointer l'acompte reçu" (cahier des charges) : une seule action
          // admin enchaîne ACOMPTE_RECU puis CONFIRME. Fonctionne aussi bien
          // depuis ACOMPTE_EN_ATTENTE que depuis ACOMPTE_EXPIRE (régularisation
          // tardive) — TRANSITIONS autorise les deux vers ACOMPTE_RECU.
          if (!reservation.devis) {
            throw new Error("Aucun devis lié à cette réservation.");
          }
          await tx.devis.update({
            where: { id: reservation.devis.id },
            data: {
              acompteStatutPaiement: "RECU",
              acompteDateReglement: extra?.acompteDateReglement
                ? new Date(extra.acompteDateReglement)
                : new Date(),
              acompteReferenceReglement: extra?.acompteReferenceReglement ?? null,
            },
          });
          await transition(tx, id, "ACOMPTE_RECU", {
            changedBy,
            note: note ?? "Acompte pointé comme reçu",
          });
          await transition(tx, id, "CONFIRME", {
            changedBy,
            note: "Auto : acompte reçu -> confirmé",
          });
          break;
        }

        case "ACOMPTE_EXPIRE": {
          await transition(tx, id, "ACOMPTE_EXPIRE", { changedBy, note });
          break;
        }

        case "REALISE": {
          await transition(tx, id, "REALISE", { changedBy, note });
          break;
        }

        case "FACTURE_AJUSTEE": {
          const facture = reservation.devis?.facture;
          if (!facture) {
            throw new Error("Aucune facture liée à cette réservation.");
          }
          await tx.facture.update({
            where: { id: facture.id },
            data: {
              ...(extra?.nbAdultesReel !== undefined
                ? { nbAdultesReel: extra.nbAdultesReel }
                : {}),
              ...(extra?.nbEnfantsReel !== undefined
                ? { nbEnfantsReel: extra.nbEnfantsReel }
                : {}),
              ...(extra?.montantFinal !== undefined
                ? { montantFinal: extra.montantFinal }
                : {}),
              ajuste: true,
              ajusteLe: new Date(),
              ajustePar: changedBy,
            },
          });
          await transition(tx, id, "FACTURE_AJUSTEE", { changedBy, note });
          break;
        }

        case "FACTURE_ENVOYEE": {
          await transition(tx, id, "FACTURE_ENVOYEE", { changedBy, note });
          break;
        }

        case "SOLDE": {
          const facture = reservation.devis?.facture;
          if (!facture) {
            throw new Error("Aucune facture liée à cette réservation.");
          }
          await tx.facture.update({
            where: { id: facture.id },
            data: {
              soldeStatutPaiement: "RECU",
              soldeDateReglement: extra?.soldeDateReglement
                ? new Date(extra.soldeDateReglement)
                : new Date(),
              soldeReferenceReglement: extra?.soldeReferenceReglement ?? null,
            },
          });
          await transition(tx, id, "SOLDE", { changedBy, note });
          break;
        }

        case "ANNULE": {
          await transition(tx, id, "ANNULE", { changedBy, note });
          break;
        }

        default: {
          // Cibles restantes (DEVIS_INTERNE_GENERE, EN_ATTENTE_VALIDATION_ADMIN...)
          // appartiennent au parcours de création de réservation (moteur de
          // tarification + création du Devis dans src/app/api/reservations,
          // hors périmètre de cet écran admin) : on ne les propose jamais côté
          // UI, mais on laisse `transition()` valider/refuser au cas où.
          await transition(tx, id, to, { changedBy, note });
        }
      }
    });
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await applyEffects(id, to);

  const updated = await prisma.reservation.findUnique({
    where: { id },
    include: {
      creneau: { include: { visite: true } },
      client: true,
      devis: { include: { facture: true } },
      historique: { orderBy: { changedAt: "desc" } },
    },
  });

  return NextResponse.json({ reservation: updated });
}
