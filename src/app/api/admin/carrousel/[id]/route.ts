import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { photoCarrouselSchema } from "@/lib/validation/photoCarrouselSchema";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const photo = await prisma.photoCarrousel.findUnique({ where: { id } });

  if (!photo) {
    return NextResponse.json({ error: "Photo introuvable." }, { status: 404 });
  }

  return NextResponse.json({ photo });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.photoCarrousel.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Photo introuvable." }, { status: 404 });
  }

  const json = await request.json().catch(() => null);
  if (!json || typeof json !== "object") {
    return NextResponse.json(
      { error: { formErrors: ["Corps de requête invalide."], fieldErrors: {} } },
      { status: 400 }
    );
  }

  // Partial update — see src/app/api/admin/produits/[id]/route.ts for the
  // full rationale on why presence is checked against the raw body.
  const parsed = photoCarrouselSchema.partial().safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data: Prisma.PhotoCarrouselUncheckedUpdateInput = {};
  const body = json as Record<string, unknown>;

  if ("url" in body) data.url = parsed.data.url;
  if ("legende" in body) data.legende = parsed.data.legende ?? null;
  if ("ordre" in body) data.ordre = parsed.data.ordre;
  if ("actif" in body) data.actif = parsed.data.actif;

  const updated = await prisma.photoCarrousel.update({ where: { id }, data });

  return NextResponse.json({ photo: updated });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.photoCarrousel.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Photo introuvable." }, { status: 404 });
  }

  await prisma.photoCarrousel.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
