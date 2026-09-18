import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateNumero } from "@/lib/numbering";
import type { PrismaTransactionClient } from "@/lib/reservationWorkflow/transitions";

/**
 * Ajout manuel d'un Devis à un compte client existant, hors parcours de
 * réservation (cahier des charges §3.4). Pas de `reservationId`, pas de
 * `Creneau`/`Visite`, et surtout pas de moteur de tarification : l'admin
 * saisit directement un montant. On documente ici la simplification des
 * champs de tarification détaillée du modèle `Devis`, qui n'ont pas de sens
 * pour une entrée manuelle : tarifs unitaires à 0, coût individuel /
 * montant-avant-majoration recopiés sur `montantTotal`, TVA et acompte à 0.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as
    | { nbAdultes?: number; nbEnfants?: number; montantTotal?: number }
    | null;

  const nbAdultes = Number(body?.nbAdultes);
  const nbEnfants = Number(body?.nbEnfants);
  const montantTotal = Number(body?.montantTotal);

  if (
    !Number.isFinite(nbAdultes) ||
    nbAdultes < 0 ||
    !Number.isFinite(nbEnfants) ||
    nbEnfants < 0 ||
    !Number.isFinite(montantTotal) ||
    montantTotal < 0
  ) {
    return NextResponse.json(
      { error: "nbAdultes, nbEnfants et montantTotal doivent être des nombres positifs." },
      { status: 400 }
    );
  }

  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) {
    return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  }

  const devis = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const numero = await generateNumero("DEVIS", tx);
    return tx.devis.create({
      data: {
        numero,
        clientId: id,
        origineManuelle: true,
        nbAdultes,
        nbEnfants,
        tarifAdulteApplique: 0,
        tarifEnfantApplique: 0,
        coutIndividuelTotal: montantTotal,
        montantAvantMajoration: montantTotal,
        montantTotal,
        tauxTVA: 0,
        acomptePourcentage: 0,
        acompteMontant: 0,
        acompteDelaiJours: 0,
      },
    });
  });

  return NextResponse.json({ devis }, { status: 201 });
}
