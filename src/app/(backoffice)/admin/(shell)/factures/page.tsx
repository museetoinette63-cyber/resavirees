import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatEuros } from "@/lib/formatMoney";
import { STATUT_PAIEMENT_LABELS, STATUT_PAIEMENT_COLORS } from "@/lib/reservationStatusLabels";

export default async function FacturesListPage() {
  const factures = await prisma.facture.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      client: true,
      devis: { include: { reservation: { include: { creneau: { include: { visite: true } } } } } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-stone-900">Factures</h1>
        <Link
          href="/admin/factures/nouveau"
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          + Nouvelle facture
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
              <th className="px-4 py-3">Solde</th>
              <th className="px-4 py-3">Litige</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {factures.map((f) => (
              <tr key={f.id}>
                <td className="px-4 py-3 font-medium text-stone-900">{f.numero}</td>
                <td className="px-4 py-3 text-stone-700">
                  {f.client?.nomOuRaisonSociale ?? f.devis.reservation?.nomOuRaisonSociale ?? "—"}
                </td>
                <td className="px-4 py-3 text-stone-500">
                  {f.devis.reservation
                    ? `Réservation · ${f.devis.reservation.creneau.visite.nom}`
                    : "Ajout manuel"}
                </td>
                <td className="px-4 py-3 font-medium text-stone-900">{formatEuros(f.montantFinal)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_PAIEMENT_COLORS[f.soldeStatutPaiement]}`}
                  >
                    {STATUT_PAIEMENT_LABELS[f.soldeStatutPaiement]}
                  </span>
                </td>
                <td className="px-4 py-3 text-stone-500">{f.noteLitige ? "⚠️" : "—"}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/factures/${f.id}`} className="text-stone-600 hover:text-stone-900">
                    Voir
                  </Link>
                </td>
              </tr>
            ))}
            {factures.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-stone-500">
                  Aucune facture pour le moment.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
