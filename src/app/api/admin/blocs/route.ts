import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { blocContenuSchema } from "@/lib/validation/blocContenuSchema";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const blocs = await prisma.blocContenu.findMany({
    orderBy: [{ emplacement: "asc" }, { ordre: "asc" }],
  });

  return NextResponse.json({ blocs });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = blocContenuSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { titre, imageUrl, ...rest } = parsed.data;

  const data: Prisma.BlocContenuUncheckedCreateInput = {
    ...rest,
    titre: titre ?? null,
    imageUrl: imageUrl ?? null,
  };

  const created = await prisma.blocContenu.create({ data });

  return NextResponse.json({ bloc: created }, { status: 201 });
}
