/**
 * Génération des numéros de devis/facture — cahier des charges §3 / §6.
 *
 * Utilise le modèle `NumberingCounter` (Prisma) comme compteur atomique par
 * préfixe court + année civile : un `upsert` (create seq=1 / increment seq)
 * exécuté dans la transaction DB appelante garantit l'unicité même en cas
 * d'écritures concurrentes (l'incrément est une opération atomique au niveau
 * de la ligne côté PostgreSQL).
 *
 * Format produit : `DEV-2026-00001` / `FAC-2026-00001`, remis à zéro chaque
 * année civile (nouvelle ligne de compteur, ex. id "DEV-2027").
 */

import type { PrismaTransactionClient } from "./reservationWorkflow/transitions";

export type NumeroPrefix = "DEVIS" | "FACTURE";

const SHORT_PREFIXES: Record<NumeroPrefix, string> = {
  DEVIS: "DEV",
  FACTURE: "FAC",
};

const SEQ_PADDING = 5;

/**
 * Génère le prochain numéro pour le préfixe donné, pour l'année civile en
 * cours, en incrémentant atomiquement le compteur correspondant.
 *
 * Doit être appelée à l'intérieur de la même transaction DB que la création
 * du `Devis`/`Facture` associé, pour éviter tout numéro "brûlé" en cas
 * d'échec de la création qui suit.
 */
export async function generateNumero(
  prefix: NumeroPrefix,
  tx: PrismaTransactionClient
): Promise<string> {
  const shortPrefix = SHORT_PREFIXES[prefix];
  const year = new Date().getFullYear();
  const counterId = `${shortPrefix}-${year}`;

  const counter = await tx.numberingCounter.upsert({
    where: { id: counterId },
    create: { id: counterId, seq: 1 },
    update: { seq: { increment: 1 } },
  });

  const seq = String(counter.seq).padStart(SEQ_PADDING, "0");
  return `${shortPrefix}-${year}-${seq}`;
}
