import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateNumero } from "@/lib/numbering";
import type { PrismaTransactionClient } from "@/lib/reservationWorkflow/transitions";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const factures = await prisma.facture.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      client: true,
      devis: { include: { reservation: { include: { creneau: { include: { visite: true } } } } } },
    },
  });

  return NextResponse.json({ factures });
}

/**
 * Création manuelle d'une facture, à partir d'un devis existant sans
 * facture (cahier des charges §3.4). Le devis n'a pas besoin d'être manuel —
 * on garde la même contrainte que la route scoped-client existante : un
 * devis lié à une réservation est censé recevoir sa facture automatiquement
 * au passage à REALISE, donc en pratique cette création manuelle sert
 * surtout aux devis manuels, mais rien ne l'empêche techniquement.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { devisId?: string; montantFinal?: number; nbAdultesReel?: number; nbEnfantsReel?: number }
    | null;

  const devisId = body?.devisId;
  if (!devisId) {
    return NextResponse.json({ error: "Le devis est requis." }, { status: 400 });
  }

  const devis = await prisma.devis.findUnique({ where: { id: devisId }, include: { facture: true } });
  if (!devis) {
    return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
  }
  if (devis.facture) {
    return NextResponse.json({ error: "Ce devis a déjà une facture." }, { status: 400 });
  }

  const montantFinal =
    body?.montantFinal !== undefined ? Number(body.montantFinal) : Number(devis.montantTotal);
  const nbAdultesReel =
    body?.nbAdultesReel !== undefined ? Number(body.nbAdultesReel) : devis.nbAdultes;
  const nbEnfantsReel =
    body?.nbEnfantsReel !== undefined ? Number(body.nbEnfantsReel) : devis.nbEnfants;

  if (
    !Number.isFinite(montantFinal) ||
    montantFinal < 0 ||
    !Number.isFinite(nbAdultesReel) ||
    nbAdultesReel < 0 ||
    !Number.isFinite(nbEnfantsReel) ||
    nbEnfantsReel < 0
  ) {
    return NextResponse.json({ error: "Champs numériques invalides." }, { status: 400 });
  }

  const facture = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const numero = await generateNumero("FACTURE", tx);
    return tx.facture.create({
      data: {
        numero,
        devisId: devis.id,
        clientId: devis.clientId,
        nbAdultesReel,
        nbEnfantsReel,
        montantFinal,
        tauxTVA: devis.tauxTVA,
      },
    });
  });

  return NextResponse.json({ facture }, { status: 201 });
}
