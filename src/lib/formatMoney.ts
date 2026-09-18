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
