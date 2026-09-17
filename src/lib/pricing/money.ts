import { Prisma } from "@prisma/client";

/** Convertit un montant Decimal (euros) en centimes entiers pour le moteur de tarification. */
export function toCents(value: Prisma.Decimal | number | string): number {
  const decimal = new Prisma.Decimal(value);
  return decimal.mul(100).round().toNumber();
}

/** Convertit des centimes entiers en Decimal (euros) pour la persistance. */
export function fromCents(cents: number): Prisma.Decimal {
  return new Prisma.Decimal(cents).div(100);
}
