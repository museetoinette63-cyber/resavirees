import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ErreurFacture, envoyerFacture } from "@/lib/facturation/envoiFacture";

type RouteContext = { params: Promise<{ id: string }> };

// Bouton « Envoyer par e-mail » de la fiche facture : génère le PDF et
// l'envoie au client en pièce jointe.
export async function POST(_request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const { to } = await envoyerFacture(id);
    return NextResponse.json({ success: true, to });
  } catch (err) {
    if (err instanceof ErreurFacture) {
      return NextResponse.json({ error: err.message }, { status: err.statut });
    }
    console.error("[api/admin/factures/envoyer] erreur inattendue :", err);
    return NextResponse.json({ error: "Une erreur est survenue pendant l'envoi." }, { status: 500 });
  }
}
