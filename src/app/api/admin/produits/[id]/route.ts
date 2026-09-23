import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { produitSchema } from "@/lib/validation/produitSchema";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const produit = await prisma.produit.findUnique({
    where: { id },
    include: { visite: { select: { nom: true } } },
  });

  if (!produit) {
    return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
  }

  return NextResponse.json({ produit });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.produit.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
  }

  const json = await request.json().catch(() => null);
  if (!json || typeof json !== "object") {
    return NextResponse.json(
      { error: { formErrors: ["Corps de requête invalide."], fieldErrors: {} } },
      { status: 400 }
    );
  }

  // Partial update: only fields actually present in the request body are
  // touched. `produitSchema.partial()` validates whatever subset was sent;
  // presence is then checked against the raw body (not `parsed.data`, since
  // a nullable+optional field parses to `undefined` both when omitted and
  // when explicitly sent as null) so the admin can deliberately clear
  // description/dureeMinutes/visiteId via PATCH.
  const parsed = produitSchema.partial().safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data: Prisma.ProduitUncheckedUpdateInput = {};
  const body = json as Record<string, unknown>;

  if ("nom" in body) data.nom = parsed.data.nom;
  if ("description" in body) data.description = parsed.data.description ?? null;
  if ("prixUnitaire" in body) data.prixUnitaire = parsed.data.prixUnitaire;
  if ("dureeMinutes" in body) data.dureeMinutes = parsed.data.dureeMinutes ?? null;
  if ("actif" in body) data.actif = parsed.data.actif;
  if ("visiteId" in body) {
    const visiteId = parsed.data.visiteId ?? null;
    if (visiteId) {
      const visite = await prisma.visite.findUnique({ where: { id: visiteId } });
      if (!visite) {
        return NextResponse.json(
          { error: { formErrors: ["Visite liée introuvable."], fieldErrors: {} } },
          { status: 400 }
        );
      }
    }
    data.visiteId = visiteId;
  }

  const updated = await prisma.produit.update({
    where: { id },
    data,
    include: { visite: { select: { nom: true } } },
  });

  return NextResponse.json({ produit: updated });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.produit.findUnique({
    where: { id },
    include: { devisLignes: { take: 1 }, factureLignes: { take: 1 } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
  }

  if (existing.devisLignes.length > 0 || existing.factureLignes.length > 0) {
    return NextResponse.json(
      {
        error: {
          formErrors: [
            "Impossible de supprimer ce produit : il est référencé par au moins un devis ou une facture. Désactivez-le plutôt si vous ne voulez plus le proposer.",
          ],
          fieldErrors: {},
        },
      },
      { status: 409 }
    );
  }

  await prisma.produit.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
