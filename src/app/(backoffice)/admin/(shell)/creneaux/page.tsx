import Link from "next/link";
import { Suspense } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import CreneauxFilterBar from "./CreneauxFilterBar";
import CreneauxTable, { type CreneauRow } from "./CreneauxTable";

const PARIS_TZ = "Europe/Paris";

export default async function AdminCreneauxPage({
  searchParams,
}: {
  searchParams: Promise<{ visiteId?: string; status?: string }>;
}) {
  const { visiteId, status } = await searchParams;

  const [visites, creneaux] = await Promise.all([
    prisma.visite.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
    prisma.creneau.findMany({
      where: {
        ...(visiteId ? { visiteId } : {}),
        ...(status ? { status: status as "PUBLIE" | "RESERVE" | "MASQUE" } : {}),
      },
      orderBy: { dateHeure: "asc" },
      include: { visite: { select: { nom: true } } },
    }),
  ]);

  const rows: CreneauRow[] = creneaux.map((c) => ({
    id: c.id,
    visiteNom: c.visite.nom,
    dateLabel: formatInTimeZone(c.dateHeure, PARIS_TZ, "EEEE d MMMM yyyy", { locale: fr }),
    heureLabel: formatInTimeZone(c.dateHeure, PARIS_TZ, "HH:mm"),
    status: c.status,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-stone-900">Créneaux</h1>
        <Link
          href="/admin/creneaux/nouveau-lot"
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          Créer des créneaux en lot
        </Link>
      </div>

      <Suspense fallback={null}>
        <CreneauxFilterBar visites={visites} />
      </Suspense>

      <CreneauxTable rows={rows} />
    </div>
  );
}
