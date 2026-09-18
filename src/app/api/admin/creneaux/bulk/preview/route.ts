import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { creneauBulkSchema } from "@/lib/validation/creneauBulkSchema";

// Dry-run counterpart to POST /api/admin/creneaux/bulk: validates the same
// creneauBulkSchema (so the 2000-row cap and all other rules are enforced
// identically) and returns the exact list of matching dates without writing
// anything, so the admin form can show "Ceci va créer N créneaux" before
// the admin confirms.

// Mirrors creneauBulkSchema's internal `countMatchingDays` day-matching
// logic (not exported from that module) so preview and actual creation stay
// in lockstep: same UTC-midnight walk from dateDebut to dateFin inclusive,
// same 0=dimanche..6=samedi weekday numbering.
function matchingDates(dateDebut: Date, dateFin: Date, joursDeSemaine: number[]): Date[] {
  const jours = new Set(joursDeSemaine);
  const dates: Date[] = [];

  const cursor = new Date(
    Date.UTC(dateDebut.getUTCFullYear(), dateDebut.getUTCMonth(), dateDebut.getUTCDate())
  );
  const end = new Date(
    Date.UTC(dateFin.getUTCFullYear(), dateFin.getUTCMonth(), dateFin.getUTCDate())
  );

  while (cursor.getTime() <= end.getTime()) {
    if (jours.has(cursor.getUTCDay())) {
      dates.push(new Date(cursor));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = creneauBulkSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { visiteId, joursDeSemaine, dateDebut, dateFin, horaires } = parsed.data;

  const visite = await prisma.visite.findUnique({ where: { id: visiteId }, select: { id: true } });
  if (!visite) {
    return NextResponse.json(
      { error: { formErrors: ["Visite introuvable."], fieldErrors: {} } },
      { status: 400 }
    );
  }

  const dates = matchingDates(new Date(dateDebut), new Date(dateFin), joursDeSemaine);
  const totalCreneaux = dates.length * horaires.length;

  return NextResponse.json({
    joursCount: dates.length,
    horairesCount: horaires.length,
    totalCreneaux,
    sampleDates: dates.slice(0, 20).map((d) => d.toISOString().slice(0, 10)),
  });
}
