import Link from "next/link";
import { Prisma, type ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_COLORS,
  RESERVATION_STATUS_ORDER,
} from "@/lib/reservationStatusLabels";
import { formatEuros } from "@/lib/formatMoney";
import { cn } from "@/lib/cn";

/**
 * Vue d'ensemble du calendrier : liste/agenda de toutes les réservations
 * dont le créneau est actif (ni masqué ni republié — un créneau `MASQUE`
 * correspond à une réservation annulée ou à un créneau retiré manuellement),
 * filtrable par plage de dates et par statut. Pour la vue jour par jour
 * (tous les créneaux, réservés ou non), voir `calendrier/jour/[date]`.
 */
export default async function CalendrierPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; status?: string }>;
}) {
  const { from, to, status } = await searchParams;

  const creneauWhere: Prisma.CreneauWhereInput = { status: { not: "MASQUE" } };
  if (from || to) {
    creneauWhere.dateHeure = {
      ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
    };
  }

  const where: Prisma.ReservationWhereInput = {
    creneau: creneauWhere,
    ...(status && status !== "tous" ? { status: status as ReservationStatus } : {}),
  };

  const reservations = await prisma.reservation.findMany({
    where,
    include: { creneau: { include: { visite: true } }, devis: true },
    orderBy: { creneau: { dateHeure: "asc" } },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-stone-900">Calendrier — vue d&apos;ensemble</h1>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="from" className="block text-xs font-medium text-stone-600">
            Du
          </label>
          <input
            id="from"
            type="date"
            name="from"
            defaultValue={from}
            className="mt-1 rounded-md border border-stone-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="to" className="block text-xs font-medium text-stone-600">
            Au
          </label>
          <input
            id="to"
            type="date"
            name="to"
            defaultValue={to}
            className="mt-1 rounded-md border border-stone-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="status" className="block text-xs font-medium text-stone-600">
            Statut
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? "tous"}
            className="mt-1 rounded-md border border-stone-300 px-3 py-1.5 text-sm"
          >
            <option value="tous">Tous</option>
            {RESERVATION_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {RESERVATION_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          Filtrer
        </button>
        <Link
          href="/admin/calendrier"
          className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-100"
        >
          Réinitialiser
        </Link>
      </form>

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">Date / heure</th>
              <th className="px-4 py-3">Visite</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Montant</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {reservations.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/calendrier/jour/${r.creneau.dateHeure.toISOString().slice(0, 10)}`}
                    className="underline"
                  >
                    {r.creneau.dateHeure.toLocaleString("fr-FR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </Link>
                </td>
                <td className="px-4 py-3">{r.creneau.visite.nom}</td>
                <td className="px-4 py-3">{r.nomOuRaisonSociale}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      RESERVATION_STATUS_COLORS[r.status]
                    )}
                  >
                    {RESERVATION_STATUS_LABELS[r.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {r.devis ? formatEuros(r.devis.montantTotal) : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/reservations/${r.id}`} className="text-stone-900 underline">
                    Voir
                  </Link>
                </td>
              </tr>
            ))}
            {reservations.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-stone-400">
                  Aucune réservation sur cette période.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
