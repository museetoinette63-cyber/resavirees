import Link from "next/link";
import type { ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_COLORS,
  RESERVATION_STATUS_ORDER,
} from "@/lib/reservationStatusLabels";
import { formatEuros } from "@/lib/formatMoney";
import { cn } from "@/lib/cn";

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const where = status && status !== "tous" ? { status: status as ReservationStatus } : {};

  const reservations = await prisma.reservation.findMany({
    where,
    include: { creneau: { include: { visite: true } }, devis: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-stone-900">Réservations</h1>

      <form method="get" className="flex items-end gap-3">
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
      </form>

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Visite</th>
              <th className="px-4 py-3">Date / heure</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Montant</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {reservations.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">{r.nomOuRaisonSociale}</td>
                <td className="px-4 py-3">{r.creneau.visite.nom}</td>
                <td className="px-4 py-3">
                  {r.creneau.dateHeure.toLocaleString("fr-FR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </td>
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
                  Aucune réservation.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
