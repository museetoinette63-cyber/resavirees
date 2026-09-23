import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatEuros } from "@/lib/formatMoney";
import { STATUT_PAIEMENT_LABELS, STATUT_PAIEMENT_COLORS } from "@/lib/reservationStatusLabels";

export default async function DevisListPage() {
  const devis = await prisma.devis.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      client: true,
      reservation: { include: { creneau: { include: { visite: true } } } },
      facture: { select: { id: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-stone-900">Devis</h1>
        <Link
          href="/admin/devis/nouveau"
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          + Nouveau devis
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs font-medium uppercase text-stone-500">
            <tr>
              <th className="px-4 py-3">Numéro</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Origine</th>
              <th className="px-4 py-3">Montant</th>
              <th className="px-4 py-3">Acompte</th>
              <th className="px-4 py-3">Facture</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {devis.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-3 font-medium text-stone-900">{d.numero}</td>
                <td className="px-4 py-3 text-stone-700">
                  {d.client?.nomOuRaisonSociale ?? d.reservation?.nomOuRaisonSociale ?? "—"}
                </td>
                <td className="px-4 py-3 text-stone-500">
                  {d.reservation
                    ? `Réservation · ${d.reservation.creneau.visite.nom}`
                    : "Ajout manuel"}
                </td>
                <td className="px-4 py-3 font-medium text-stone-900">{formatEuros(d.montantTotal)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_PAIEMENT_COLORS[d.acompteStatutPaiement]}`}
                  >
                    {STATUT_PAIEMENT_LABELS[d.acompteStatutPaiement]}
                  </span>
                </td>
                <td className="px-4 py-3 text-stone-500">{d.facture ? "Oui" : "—"}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/devis/${d.id}`} className="text-stone-600 hover:text-stone-900">
                    Voir
                  </Link>
                </td>
              </tr>
            ))}
            {devis.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-stone-500">
                  Aucun devis pour le moment.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
