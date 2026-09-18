import type { PrismaClient, ReservationStatus } from "@prisma/client";

export type PrismaTransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Table de transitions — cahier des charges §5.1 (12 statuts) et §5.2 (branche Annulation,
 * déclenchable manuellement entre les statuts 1 "Demande reçue" et 9 "Réalisé" inclus).
 */
export const TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  DEMANDE_RECUE: ["DEVIS_INTERNE_GENERE", "ANNULE"],
  DEVIS_INTERNE_GENERE: ["EN_ATTENTE_VALIDATION_ADMIN", "ANNULE"],
  EN_ATTENTE_VALIDATION_ADMIN: ["DEVIS_VALIDE", "ANNULE"],
  DEVIS_VALIDE: ["DEVIS_ENVOYE", "ANNULE"],
  DEVIS_ENVOYE: ["ACOMPTE_EN_ATTENTE", "ANNULE"],
  ACOMPTE_EN_ATTENTE: ["ACOMPTE_RECU", "ACOMPTE_EXPIRE", "ANNULE"],
  ACOMPTE_RECU: ["CONFIRME", "ANNULE"],
  ACOMPTE_EXPIRE: ["ACOMPTE_RECU", "ANNULE"],
  CONFIRME: ["REALISE", "ANNULE"],
  REALISE: ["FACTURE_AJUSTEE", "FACTURE_ENVOYEE", "ANNULE"],
  FACTURE_AJUSTEE: ["FACTURE_ENVOYEE"],
  FACTURE_ENVOYEE: ["SOLDE"],
  SOLDE: [],
  ANNULE: [],
};

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: ReservationStatus,
    public readonly to: ReservationStatus
  ) {
    super(`Transition invalide : ${from} -> ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export interface TransitionOptions {
  /** E-mail de l'admin à l'origine de la transition, null si automatique/système. */
  changedBy: string | null;
  note?: string;
}

/**
 * Vérifie la table de transitions, met à jour le statut de la réservation et écrit
 * une ligne d'historique, dans la même transaction DB. Les effets de bord (e-mail, PDF,
 * Google Agenda) sont déclenchés séparément après commit — voir effects.ts.
 */
export async function transition(
  tx: PrismaTransactionClient,
  reservationId: string,
  to: ReservationStatus,
  opts: TransitionOptions
) {
  const reservation = await tx.reservation.findUniqueOrThrow({ where: { id: reservationId } });

  if (!TRANSITIONS[reservation.status].includes(to)) {
    throw new InvalidTransitionError(reservation.status, to);
  }

  const updated = await tx.reservation.update({
    where: { id: reservationId },
    data: { status: to },
  });

  await tx.reservationStatusHistory.create({
    data: {
      reservationId,
      fromStatus: reservation.status,
      toStatus: to,
      changedBy: opts.changedBy,
      note: opts.note,
    },
  });

  return updated;
}

/** Statuts entre lesquels l'annulation manuelle est autorisée (§5.2 : de 1 à 9 inclus). */
export const STATUTS_ANNULABLES: ReservationStatus[] = [
  "DEMANDE_RECUE",
  "DEVIS_INTERNE_GENERE",
  "EN_ATTENTE_VALIDATION_ADMIN",
  "DEVIS_VALIDE",
  "DEVIS_ENVOYE",
  "ACOMPTE_EN_ATTENTE",
  "ACOMPTE_RECU",
  "ACOMPTE_EXPIRE",
  "CONFIRME",
  "REALISE",
];
