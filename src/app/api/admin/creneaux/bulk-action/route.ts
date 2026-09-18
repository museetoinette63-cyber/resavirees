import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bodySchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Aucun créneau sélectionné."),
  action: z.enum(["masquer", "supprimer"]),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { ids, action } = parsed.data;

  const creneaux = await prisma.creneau.findMany({
    where: { id: { in: ids } },
    select: { id: true, status: true },
  });

  // RESERVE créneaux are skipped rather than failing the whole batch, and
  // reported back so the admin UI can explain why some rows didn't change.
  const eligibleIds = creneaux.filter((c) => c.status !== "RESERVE").map((c) => c.id);
  const skippedIds = creneaux.filter((c) => c.status === "RESERVE").map((c) => c.id);
  const notFoundIds = ids.filter((id) => !creneaux.some((c) => c.id === id));

  if (action === "masquer") {
    if (eligibleIds.length > 0) {
      await prisma.creneau.updateMany({
        where: { id: { in: eligibleIds } },
        data: { status: "MASQUE" },
      });
    }
  } else {
    if (eligibleIds.length > 0) {
      await prisma.creneau.deleteMany({ where: { id: { in: eligibleIds } } });
    }
  }

  return NextResponse.json({
    success: true,
    updated: eligibleIds.length,
    skipped: skippedIds,
    notFound: notFoundIds,
  });
}
