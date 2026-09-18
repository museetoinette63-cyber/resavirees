import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateNumero } from "@/lib/numbering";
import type { PrismaTransactionClient } from "@/lib/reservationWorkflow/transitions";

/**
 * Ajout manuel d'une Facture à un compte client existant (cahier des charges
 * §3.4), rattachée à un `Devis` existant du même client qui n'a pas encore de
 * facture. Par défaut recopie nb personnes / montant du devis ; l'admin peut
 * les surcharger.
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
    | {
        devisId?: string;
        montantFinal?: number;
        nbAdultesReel?: number;
        nbEnfantsReel?: number;
      }
    | null;

  const devisId = body?.devisId;
  if (!devisId) {
    return NextResponse.json({ error: "devisId requis." }, { status: 400 });
  }

  const devis = await prisma.devis.findUnique({
    where: { id: devisId },
    include: { facture: true },
  });

  if (!devis || devis.clientId !== id) {
    return NextResponse.json(
      { error: "Devis introuvable pour ce client." },
      { status: 404 }
    );
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
        clientId: id,
        nbAdultesReel,
        nbEnfantsReel,
        montantFinal,
        tauxTVA: devis.tauxTVA,
      },
    });
  });

  return NextResponse.json({ facture }, { status: 201 });
}
