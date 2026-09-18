import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { visiteSchema } from "@/lib/validation/visiteSchema";
import { regleForfaitSchema } from "@/lib/validation/regleForfaitSchema";
import { z } from "zod";

// Body shape for creation: the Visite fields plus an optional list of
// RegleForfait rows (each validated with the existing discriminated-union
// schema, which already enforces the NIVEAU_1/NIVEAU_2 field exclusivity).
const createVisiteSchema = z.object({
  visite: visiteSchema,
  reglesForfait: z.array(regleForfaitSchema).max(2).default([]),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const visites = await prisma.visite.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      reglesForfait: true,
      _count: { select: { creneaux: true } },
    },
  });

  return NextResponse.json({ visites });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = createVisiteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { visite, reglesForfait } = parsed.data;

  // Reject two rules of the same niveau up front (the unique constraint
  // would also catch it, but a 400 with a clear message is friendlier than
  // a raw Prisma unique-violation error).
  const niveaux = reglesForfait.map((r) => r.niveau);
  if (new Set(niveaux).size !== niveaux.length) {
    return NextResponse.json(
      { error: { formErrors: ["Une seule règle par niveau de forfait est autorisée."], fieldErrors: {} } },
      { status: 400 }
    );
  }

  const created = await prisma.$transaction(async (tx) => {
    const newVisite = await tx.visite.create({ data: visite });

    if (reglesForfait.length > 0) {
      await tx.regleForfait.createMany({
        data: reglesForfait.map((regle) => ({
          visiteId: newVisite.id,
          ...regle,
        })),
      });
    }

    return tx.visite.findUniqueOrThrow({
      where: { id: newVisite.id },
      include: { reglesForfait: true },
    });
  });

  return NextResponse.json({ visite: created }, { status: 201 });
}
