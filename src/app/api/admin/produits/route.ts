import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { produitSchema } from "@/lib/validation/produitSchema";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const produits = await prisma.produit.findMany({
    orderBy: { nom: "asc" },
    include: { visite: { select: { nom: true } } },
  });

  return NextResponse.json({ produits });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = produitSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { visiteId, description, dureeMinutes, ...rest } = parsed.data;

  if (visiteId) {
    const visite = await prisma.visite.findUnique({ where: { id: visiteId } });
    if (!visite) {
      return NextResponse.json(
        { error: { formErrors: ["Visite liée introuvable."], fieldErrors: {} } },
        { status: 400 }
      );
    }
  }

  const data: Prisma.ProduitUncheckedCreateInput = {
    ...rest,
    description: description ?? null,
    dureeMinutes: dureeMinutes ?? null,
    visiteId: visiteId ?? null,
  };

  const created = await prisma.produit.create({
    data,
    include: { visite: { select: { nom: true } } },
  });

  return NextResponse.json({ produit: created }, { status: 201 });
}
