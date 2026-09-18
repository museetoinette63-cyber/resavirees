import { NextRequest, NextResponse } from "next/server";
import { fromZonedTime } from "date-fns-tz";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { creneauBulkSchema } from "@/lib/validation/creneauBulkSchema";

const PARIS_TZ = "Europe/Paris";

// Same day-matching logic as creneauBulkSchema's internal `countMatchingDays`
// and app/api/admin/creneaux/bulk/preview/route.ts (kept identical across
// all three so the preview count always matches what actually gets created).
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

  // Each matching calendar date x each horaire ("HH:mm") is interpreted as
  // that local wall-clock time in Europe/Paris and converted to the UTC
  // instant stored on Creneau.dateHeure, so DST transitions are handled
  // correctly instead of assuming a fixed UTC offset.
  const dateHeures: Date[] = [];
  for (const date of dates) {
    const isoDate = date.toISOString().slice(0, 10); // "YYYY-MM-DD" (UTC-midnight date, no offset drift)
    for (const horaire of horaires) {
      const parisLocalString = `${isoDate}T${horaire}:00`;
      dateHeures.push(fromZonedTime(parisLocalString, PARIS_TZ));
    }
  }

  const created = await prisma.creneau.createMany({
    data: dateHeures.map((dateHeure) => ({
      visiteId,
      dateHeure,
      status: "PUBLIE" as const,
    })),
  });

  return NextResponse.json({ success: true, count: created.count }, { status: 201 });
}
