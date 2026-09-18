import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RESERVATION_STATUS_LABELS, RESERVATION_STATUS_COLORS } from "@/lib/reservationStatusLabels";
import { cn } from "@/lib/cn";

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Vue jour par jour : tous les créneaux (quel que soit leur statut, toutes
 * visites confondues) pour une date donnée, avec la réservation liée le cas
 * échéant. Contrairement à la vue d'ensemble, un créneau `PUBLIE` non
 * réservé ("disponible") et un créneau `MASQUE` non réservé sont affichés
 * ici — c'est tout l'intérêt de cette vue jour.
 */
export default async function CalendrierJourPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    notFound();
  }

  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59.999`);
  if (Number.isNaN(dayStart.getTime())) {
    notFound();
  }

  const creneaux = await prisma.creneau.findMany({
    where: { dateHeure: { gte: dayStart, lte: dayEnd } },
    include: { visite: true, reservation: true },
    orderBy: { dateHeure: "asc" },
  });

  const prev = addDays(date, -1);
  const next = addDays(date, 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-stone-900">
          Créneaux du{" "}
          {dayStart.toLocaleDateString("fr-FR", { dateStyle: "full" })}
        </h1>
        <div className="flex gap-2 text-sm">
          <Link
            href={`/admin/calendrier/jour/${prev}`}
            className="rounded-md border border-stone-300 px-3 py-1.5 hover:bg-stone-100"
          >
            ← Jour précédent
          </Link>
          <Link
            href="/admin/calendrier"
            className="rounded-md border border-stone-300 px-3 py-1.5 hover:bg-stone-100"
          >
            Vue d&apos;ensemble
          </Link>
          <Link
            href={`/admin/calendrier/jour/${next}`}
            className="rounded-md border border-stone-300 px-3 py-1.5 hover:bg-stone-100"
          >
            Jour suivant →
          </Link>
        </div>
      </div>

      {creneaux.length === 0 ? (
        <p className="text-sm text-stone-500">Aucun créneau ce jour-là.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3">Heure</th>
                <th className="px-4 py-3">Visite</th>
                <th className="px-4 py-3">Statut créneau</th>
                <th className="px-4 py-3">Réservation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {creneaux.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3">
                    {c.dateHeure.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3">{c.visite.nom}</td>
                  <td className="px-4 py-3 text-stone-600">{c.status}</td>
                  <td className="px-4 py-3">
                    {c.reservation ? (
                      <Link
                        href={`/admin/reservations/${c.reservation.id}`}
                        className="inline-flex items-center gap-2 underline"
                      >
                        {c.reservation.nomOuRaisonSociale}
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium no-underline",
                            RESERVATION_STATUS_COLORS[c.reservation.status]
                          )}
                        >
                          {RESERVATION_STATUS_LABELS[c.reservation.status]}
                        </span>
                      </Link>
                    ) : c.status === "MASQUE" ? (
                      <span className="text-stone-400">masqué</span>
                    ) : (
                      <span className="text-stone-400">disponible</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
