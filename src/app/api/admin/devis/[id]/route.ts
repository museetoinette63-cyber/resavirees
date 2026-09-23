import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const devis = await prisma.devis.findUnique({
    where: { id },
    include: {
      client: true,
      reservation: { include: { creneau: { include: { visite: true } } } },
      facture: true,
    },
  });

  if (!devis) {
    return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
  }

  return NextResponse.json({ devis });
}

/**
 * Édition d'un devis. Pour un devis rattaché à une réservation, seule la
 * note libre (`notesAdmin` sur la réservation, pas ce devis) devrait passer
 * par le cycle de vie de la réservation (§5 du cahier des charges) — cette
 * route refuse donc de modifier les montants/le statut d'acompte d'un devis
 * lié (`reservationId` non nul), pour ne jamais désynchroniser la machine à
 * états. Un devis manuel (`origineManuelle: true`) reste librement éditable
 * ici : montants, et pointage de l'acompte (statut/date/référence).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const devis = await prisma.devis.findUnique({ where: { id } });
  if (!devis) {
    return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
  }

  if (devis.reservationId) {
    return NextResponse.json(
      {
        error:
          "Ce devis est rattaché à une réservation : gérez ses montants et son acompte depuis la fiche réservation pour rester cohérent avec le cycle de vie.",
      },
      { status: 409 }
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        nbAdultes?: number;
        nbEnfants?: number;
        montantTotal?: number;
        acompteStatutPaiement?: "EN_ATTENTE" | "RECU" | "EXPIRE";
        acompteDateReglement?: string | null;
        acompteReferenceReglement?: string | null;
      }
    | null;

  const data: Record<string, unknown> = {};

  if (body?.nbAdultes !== undefined) {
    const v = Number(body.nbAdultes);
    if (!Number.isFinite(v) || v < 0) {
      return NextResponse.json({ error: "nbAdultes invalide." }, { status: 400 });
    }
    data.nbAdultes = v;
  }
  if (body?.nbEnfants !== undefined) {
    const v = Number(body.nbEnfants);
    if (!Number.isFinite(v) || v < 0) {
      return NextResponse.json({ error: "nbEnfants invalide." }, { status: 400 });
    }
    data.nbEnfants = v;
  }
  if (body?.montantTotal !== undefined) {
    const v = Number(body.montantTotal);
    if (!Number.isFinite(v) || v < 0) {
      return NextResponse.json({ error: "montantTotal invalide." }, { status: 400 });
    }
    data.montantTotal = v;
    data.coutIndividuelTotal = v;
    data.montantAvantMajoration = v;
  }
  if (body?.acompteStatutPaiement !== undefined) {
    data.acompteStatutPaiement = body.acompteStatutPaiement;
    if (body.acompteStatutPaiement === "RECU") {
      data.acompteDateReglement = body.acompteDateReglement
        ? new Date(body.acompteDateReglement)
        : new Date();
      data.acompteReferenceReglement = body.acompteReferenceReglement ?? null;
    }
  }

  const updated = await prisma.devis.update({ where: { id }, data });
  return NextResponse.json({ devis: updated });
}
