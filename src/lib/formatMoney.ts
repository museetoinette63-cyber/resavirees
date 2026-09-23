import { Prisma } from "@prisma/client";

/**
 * Formate un montant (Decimal Prisma en euros, ou nombre en euros) au format
 * français visiteur, ex. "12,50 €". Utilisé sur les pages publiques pour
 * afficher tarifs, forfaits et montants de devis.
 */
export function formatEuros(value: Prisma.Decimal | number): string {
  const amount = value instanceof Prisma.Decimal ? value.toNumber() : value;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

/**
 * Same formatting as formatEuros, but for a plain integer-cents amount (the
 * pricing engine's native unit) — kept dependency-free (no @prisma/client
 * import) so it's cheap to use from client components like ReservationForm.
 */
export function formatCentsEuros(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}
