import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { chargerFacture } from "@/lib/facturation/envoiFacture";
import { renderFacturePdf } from "@/lib/pdf/facturePdf";

type RouteContext = { params: Promise<{ id: string }> };

// Télécharge le PDF de la facture, généré à la demande (toujours à jour :
// acompte, lignes, statut de règlement), sans dépendre d'un envoi préalable.
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const facture = await chargerFacture(id);
  if (!facture) {
    return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
  }

  const pdf = await renderFacturePdf(facture);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${facture.numero}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
