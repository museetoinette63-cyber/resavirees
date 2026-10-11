import type { Prisma, StatutPaiement } from "@prisma/client";

// Calcul du solde d'une facture en tenant compte de l'acompte du devis.
// Seul un acompte effectivement REÇU est déduit du total : un acompte prévu
// mais non réglé reste affiché sur la facture, sans réduire le montant dû.

export interface SoldeFacture {
  montantTotal: number;
  acomptePrevu: number;
  acompteStatut: StatutPaiement;
  /** Montant d'acompte réellement déduit (0 tant que l'acompte n'est pas reçu). */
  acompteRegle: number;
  resteAPayer: number;
}

function enEuros(valeur: Prisma.Decimal | number): number {
  const nombre = typeof valeur === "number" ? valeur : valeur.toNumber();
  return Math.round(nombre * 100) / 100;
}

export function calculerSolde(
  facture: { montantFinal: Prisma.Decimal | number },
  devis: { acompteMontant: Prisma.Decimal | number; acompteStatutPaiement: StatutPaiement }
): SoldeFacture {
  const montantTotal = enEuros(facture.montantFinal);
  const acomptePrevu = enEuros(devis.acompteMontant);
  const acompteRegle =
    devis.acompteStatutPaiement === "RECU" ? Math.min(acomptePrevu, montantTotal) : 0;

  return {
    montantTotal,
    acomptePrevu,
    acompteStatut: devis.acompteStatutPaiement,
    acompteRegle,
    resteAPayer: Math.round((montantTotal - acompteRegle) * 100) / 100,
  };
}
