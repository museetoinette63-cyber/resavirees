/**
 * Libellés FR et couleurs d'affichage pour `ReservationStatus` (14 valeurs,
 * cahier des charges §5.1/§5.2 — voir `prisma/schema.prisma` pour l'ordre
 * canonique et `src/lib/reservationWorkflow/transitions.ts` pour la table de
 * transitions). Centralisé ici pour être réutilisé par les écrans
 * calendrier / réservations (liste + détail) sans dupliquer le mapping.
 */
import type { ReservationStatus } from "@prisma/client";

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  DEMANDE_RECUE: "Demande reçue",
  DEVIS_INTERNE_GENERE: "Devis interne généré",
  EN_ATTENTE_VALIDATION_ADMIN: "En attente de validation admin",
  DEVIS_VALIDE: "Devis validé",
  DEVIS_ENVOYE: "Devis envoyé",
  ACOMPTE_EN_ATTENTE: "Acompte en attente",
  ACOMPTE_RECU: "Acompte reçu",
  ACOMPTE_EXPIRE: "Acompte expiré",
  CONFIRME: "Confirmé",
  REALISE: "Réalisé",
  FACTURE_AJUSTEE: "Facture ajustée",
  FACTURE_ENVOYEE: "Facture envoyée",
  SOLDE: "Soldé",
  ANNULE: "Annulé",
};

/**
 * Classes Tailwind (fond + texte) pour un badge de statut. Palette :
 * stone = début de parcours, amber = action/paiement en attente côté client
 * ou admin, blue = document émis en attente de la suite, emerald = étapes de
 * succès (confirmé/soldé), red = expiré/annulé.
 */
export const RESERVATION_STATUS_COLORS: Record<ReservationStatus, string> = {
  DEMANDE_RECUE: "bg-stone-100 text-stone-700",
  DEVIS_INTERNE_GENERE: "bg-stone-100 text-stone-700",
  EN_ATTENTE_VALIDATION_ADMIN: "bg-amber-100 text-amber-800",
  DEVIS_VALIDE: "bg-blue-100 text-blue-800",
  DEVIS_ENVOYE: "bg-blue-100 text-blue-800",
  ACOMPTE_EN_ATTENTE: "bg-amber-100 text-amber-800",
  ACOMPTE_RECU: "bg-emerald-100 text-emerald-800",
  ACOMPTE_EXPIRE: "bg-red-100 text-red-800",
  CONFIRME: "bg-emerald-100 text-emerald-800",
  REALISE: "bg-emerald-100 text-emerald-800",
  FACTURE_AJUSTEE: "bg-amber-100 text-amber-800",
  FACTURE_ENVOYEE: "bg-blue-100 text-blue-800",
  SOLDE: "bg-emerald-100 text-emerald-800",
  ANNULE: "bg-red-100 text-red-800",
};

/** Libellés/couleurs pour `StatutPaiement` (acompte/solde) — Devis/Facture. */
export const STATUT_PAIEMENT_LABELS: Record<"EN_ATTENTE" | "RECU" | "EXPIRE", string> = {
  EN_ATTENTE: "En attente",
  RECU: "Reçu",
  EXPIRE: "Expiré",
};

export const STATUT_PAIEMENT_COLORS: Record<"EN_ATTENTE" | "RECU" | "EXPIRE", string> = {
  EN_ATTENTE: "bg-amber-100 text-amber-800",
  RECU: "bg-emerald-100 text-emerald-800",
  EXPIRE: "bg-red-100 text-red-800",
};

export const RESERVATION_STATUS_ORDER: ReservationStatus[] = [
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
  "FACTURE_AJUSTEE",
  "FACTURE_ENVOYEE",
  "SOLDE",
  "ANNULE",
];
