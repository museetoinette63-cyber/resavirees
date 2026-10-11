import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderDevisPdf } from "@/lib/pdf/devisPdf";

type RouteContext = { params: Promise<{ id: string }> };

// Télécharge le PDF du devis, généré à la demande.
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const devis = await prisma.devis.findUnique({
    where: { id },
    include: {
      reservation: { include: { creneau: { include: { visite: true } } } },
      client: true,
      lignes: true,
    },
  });
  if (!devis) {
    return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
  }

  const pdf = await renderDevisPdf(devis);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${devis.numero}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
