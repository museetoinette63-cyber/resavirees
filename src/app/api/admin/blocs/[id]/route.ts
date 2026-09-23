import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { blocContenuSchema } from "@/lib/validation/blocContenuSchema";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const bloc = await prisma.blocContenu.findUnique({ where: { id } });

  if (!bloc) {
    return NextResponse.json({ error: "Bloc introuvable." }, { status: 404 });
  }

  return NextResponse.json({ bloc });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.blocContenu.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Bloc introuvable." }, { status: 404 });
  }

  const json = await request.json().catch(() => null);
  if (!json || typeof json !== "object") {
    return NextResponse.json(
      { error: { formErrors: ["Corps de requête invalide."], fieldErrors: {} } },
      { status: 400 }
    );
  }

  // Partial update: only fields actually present in the request body are
  // touched. See src/app/api/admin/produits/[id]/route.ts for the full
  // rationale (nullable+optional fields parse to `undefined` both when
  // omitted and when explicitly sent as null, so presence is checked
  // against the raw body, not `parsed.data`).
  const parsed = blocContenuSchema.partial().safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data: Prisma.BlocContenuUncheckedUpdateInput = {};
  const body = json as Record<string, unknown>;

  if ("type" in body) data.type = parsed.data.type;
  if ("emplacement" in body) data.emplacement = parsed.data.emplacement;
  if ("titre" in body) data.titre = parsed.data.titre ?? null;
  if ("contenu" in body) data.contenu = parsed.data.contenu;
  if ("imageUrl" in body) data.imageUrl = parsed.data.imageUrl ?? null;
  if ("ordre" in body) data.ordre = parsed.data.ordre;
  if ("actif" in body) data.actif = parsed.data.actif;

  const updated = await prisma.blocContenu.update({ where: { id }, data });

  return NextResponse.json({ bloc: updated });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.blocContenu.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Bloc introuvable." }, { status: 404 });
  }

  await prisma.blocContenu.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
