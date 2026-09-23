import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateNumero } from "@/lib/numbering";
import type { PrismaTransactionClient } from "@/lib/reservationWorkflow/transitions";

/**
 * Liste tous les devis (issus d'une réservation ou ajoutés manuellement),
 * pour l'onglet back-office "Devis" — vue d'ensemble indépendante de la
 * fiche réservation ou du compte client.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const devis = await prisma.devis.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      client: true,
      reservation: { include: { creneau: { include: { visite: true } } } },
      facture: { select: { id: true } },
    },
  });

  return NextResponse.json({ devis });
}

/**
 * Création manuelle d'un devis, indépendamment d'un compte client déjà
 * ouvert (cahier des charges §3.4) — même simplification que la route
 * scoped-client existante (app/api/admin/clients/[id]/devis) : pas de
 * moteur de tarification, l'admin saisit directement un montant.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { clientId?: string; nbAdultes?: number; nbEnfants?: number; montantTotal?: number }
    | null;

  const clientId = body?.clientId;
  const nbAdultes = Number(body?.nbAdultes);
  const nbEnfants = Number(body?.nbEnfants);
  const montantTotal = Number(body?.montantTotal);

  if (!clientId) {
    return NextResponse.json({ error: "Le client est requis." }, { status: 400 });
  }
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

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  }

  const devis = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const numero = await generateNumero("DEVIS", tx);
    return tx.devis.create({
      data: {
        numero,
        clientId,
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
