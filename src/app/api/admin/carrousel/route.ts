import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { photoCarrouselSchema } from "@/lib/validation/photoCarrouselSchema";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const photos = await prisma.photoCarrousel.findMany({
    orderBy: { ordre: "asc" },
  });

  return NextResponse.json({ photos });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = photoCarrouselSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { legende, ...rest } = parsed.data;

  const data: Prisma.PhotoCarrouselUncheckedCreateInput = {
    ...rest,
    legende: legende ?? null,
  };

  const created = await prisma.photoCarrousel.create({ data });

  return NextResponse.json({ photo: created }, { status: 201 });
}
