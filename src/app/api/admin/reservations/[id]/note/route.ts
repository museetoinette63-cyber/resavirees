import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Ajoute une note libre, sans transition de statut. Deux cibles possibles :
 * - `notesAdmin` (défaut) : note interne sur la Reservation, APPENDED (avec
 *   horodatage + auteur) au texte existant — c'est le champ "ajouter une
 *   note" de l'écran de détail réservation.
 * - `litige` : `Facture.noteLitige`, écrasée (pas d'append, un seul litige
 *   actif a du sens) — cahier des charges : ne bloque jamais le workflow.
 *
 * Séparé de la route `transition` (qui reste dédiée aux changements de
 * statut) pour éviter de surcharger son `switch(to)` avec un cas qui ne
 * transitionne rien.
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
    | { note?: string; target?: "notesAdmin" | "litige" }
    | null;

  const note = body?.note?.trim();
  if (!note) {
    return NextResponse.json({ error: "Note vide." }, { status: 400 });
  }

  const target = body?.target ?? "notesAdmin";

  if (target === "litige") {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { devis: { include: { facture: true } } },
    });
    const facture = reservation?.devis?.facture;
    if (!facture) {
      return NextResponse.json(
        { error: "Aucune facture liée à cette réservation." },
        { status: 400 }
      );
    }
    const updated = await prisma.facture.update({
      where: { id: facture.id },
      data: { noteLitige: note },
    });
    return NextResponse.json({ facture: updated });
  }

  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation) {
    return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
  }

  const stamp = `[${new Date().toLocaleString("fr-FR")} — ${session.user.email ?? "admin"}] ${note}`;
  const notesAdmin = reservation.notesAdmin ? `${reservation.notesAdmin}\n${stamp}` : stamp;

  const updated = await prisma.reservation.update({
    where: { id },
    data: { notesAdmin },
  });

  return NextResponse.json({ reservation: updated });
}
