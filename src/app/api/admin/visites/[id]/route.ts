import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { visiteSchema } from "@/lib/validation/visiteSchema";
import { regleForfaitSchema } from "@/lib/validation/regleForfaitSchema";
import { z } from "zod";

const updateVisiteSchema = z.object({
  visite: visiteSchema,
  reglesForfait: z.array(regleForfaitSchema).max(2).default([]),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const visite = await prisma.visite.findUnique({
    where: { id },
    include: { reglesForfait: true },
  });

  if (!visite) {
    return NextResponse.json({ error: "Visite introuvable." }, { status: 404 });
  }

  return NextResponse.json({ visite });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.visite.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Visite introuvable." }, { status: 404 });
  }

  const json = await request.json().catch(() => null);
  const parsed = updateVisiteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { visite, reglesForfait } = parsed.data;

  const niveaux = reglesForfait.map((r) => r.niveau);
  if (new Set(niveaux).size !== niveaux.length) {
    return NextResponse.json(
      { error: { formErrors: ["Une seule règle par niveau de forfait est autorisée."], fieldErrors: {} } },
      { status: 400 }
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.visite.update({ where: { id }, data: visite });

    // Upsert the (at most) two RegleForfait rows the form submitted, keyed
    // by the visiteId_niveau compound unique constraint, then delete any
    // niveau that was un-enabled (present before, absent from this submit).
    const submittedNiveaux = new Set(reglesForfait.map((r) => r.niveau));

    for (const regle of reglesForfait) {
      await tx.regleForfait.upsert({
        where: { visiteId_niveau: { visiteId: id, niveau: regle.niveau } },
        create: { visiteId: id, ...regle },
        update: { ...regle },
      });
    }

    const allNiveaux: Array<"NIVEAU_1" | "NIVEAU_2"> = ["NIVEAU_1", "NIVEAU_2"];
    const niveauxToRemove = allNiveaux.filter((n) => !submittedNiveaux.has(n));
    if (niveauxToRemove.length > 0) {
      await tx.regleForfait.deleteMany({
        where: { visiteId: id, niveau: { in: niveauxToRemove } },
      });
    }

    return tx.visite.findUniqueOrThrow({
      where: { id },
      include: { reglesForfait: true },
    });
  });

  return NextResponse.json({ visite: updated });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.visite.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Visite introuvable." }, { status: 404 });
  }

  // Une visite se supprime avec ses créneaux (ils n'ont plus de sens sans
  // elle), SAUF si une réservation y est rattachée : on ne détruit jamais
  // l'historique des réservations/devis/factures. Dans ce cas, l'admin doit
  // masquer la visite (elle disparaît du site mais l'historique reste).
  const reservationCount = await prisma.reservation.count({
    where: { creneau: { visiteId: id } },
  });
  if (reservationCount > 0) {
    return NextResponse.json(
      {
        error: {
          formErrors: [
            `Impossible de supprimer cette visite : ${reservationCount} réservation(s) y sont rattachées. Utilisez « Masquer » pour la retirer du site en conservant l'historique.`,
          ],
          fieldErrors: {},
        },
      },
      { status: 409 }
    );
  }

  // RegleForfait rows cascade-delete automatically (onDelete: Cascade in
  // prisma/schema.prisma) ; les créneaux (sans réservation) sont supprimés
  // dans la même transaction.
  await prisma.$transaction([
    prisma.creneau.deleteMany({ where: { visiteId: id } }),
    prisma.visite.delete({ where: { id } }),
  ]);

  return NextResponse.json({ success: true });
}
