import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const facture = await prisma.facture.findUnique({
    where: { id },
    include: {
      client: true,
      devis: { include: { reservation: { include: { creneau: { include: { visite: true } } } } } },
    },
  });

  if (!facture) {
    return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
  }

  return NextResponse.json({ facture });
}

/**
 * Édition d'une facture — même garde-fou que pour les devis : si la facture
 * découle d'une réservation (via son devis lié), les montants/le statut du
 * solde se gèrent depuis la fiche réservation pour ne pas désynchroniser le
 * cycle de vie. Toujours éditable ici : la note de litige (§5.3, non
 * bloquante par nature, peut être ajoutée depuis n'importe où).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const facture = await prisma.facture.findUnique({ where: { id }, include: { devis: true } });
  if (!facture) {
    return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        nbAdultesReel?: number;
        nbEnfantsReel?: number;
        montantFinal?: number;
        soldeStatutPaiement?: "EN_ATTENTE" | "RECU" | "EXPIRE";
        soldeDateReglement?: string | null;
        soldeReferenceReglement?: string | null;
        noteLitige?: string | null;
      }
    | null;

  const estRattacheeAUneReservation = !!facture.devis.reservationId;

  const data: Record<string, unknown> = {};

  if (body?.noteLitige !== undefined) {
    data.noteLitige = body.noteLitige;
  }

  if (
    !estRattacheeAUneReservation &&
    (body?.nbAdultesReel !== undefined ||
      body?.nbEnfantsReel !== undefined ||
      body?.montantFinal !== undefined ||
      body?.soldeStatutPaiement !== undefined)
  ) {
    if (body?.nbAdultesReel !== undefined) {
      const v = Number(body.nbAdultesReel);
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: "nbAdultesReel invalide." }, { status: 400 });
      }
      data.nbAdultesReel = v;
    }
    if (body?.nbEnfantsReel !== undefined) {
      const v = Number(body.nbEnfantsReel);
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: "nbEnfantsReel invalide." }, { status: 400 });
      }
      data.nbEnfantsReel = v;
    }
    if (body?.montantFinal !== undefined) {
      const v = Number(body.montantFinal);
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: "montantFinal invalide." }, { status: 400 });
      }
      data.montantFinal = v;
      data.ajuste = true;
      data.ajusteLe = new Date();
      data.ajustePar = session.user.email;
    }
    if (body?.soldeStatutPaiement !== undefined) {
      data.soldeStatutPaiement = body.soldeStatutPaiement;
      if (body.soldeStatutPaiement === "RECU") {
        data.soldeDateReglement = body.soldeDateReglement ? new Date(body.soldeDateReglement) : new Date();
        data.soldeReferenceReglement = body.soldeReferenceReglement ?? null;
      }
    }
  } else if (
    estRattacheeAUneReservation &&
    (body?.nbAdultesReel !== undefined ||
      body?.nbEnfantsReel !== undefined ||
      body?.montantFinal !== undefined ||
      body?.soldeStatutPaiement !== undefined)
  ) {
    return NextResponse.json(
      {
        error:
          "Cette facture est rattachée à une réservation : gérez son montant et son solde depuis la fiche réservation pour rester cohérent avec le cycle de vie.",
      },
      { status: 409 }
    );
  }

  const updated = await prisma.facture.update({ where: { id }, data });
  return NextResponse.json({ facture: updated });
}
