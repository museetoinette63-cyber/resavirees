import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatEuros } from "@/lib/formatMoney";
import VisiteRowActions from "./VisiteRowActions";

export default async function AdminVisitesPage() {
  const visites = await prisma.visite.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { creneaux: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-stone-900">Visites</h1>
        <Link
          href="/admin/visites/nouveau"
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          Nouvelle visite
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-stone-200 text-sm">
          <thead className="bg-stone-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-stone-500">Nom</th>
              <th className="px-4 py-3 text-left font-medium text-stone-500">Statut</th>
              <th className="px-4 py-3 text-left font-medium text-stone-500">Tarif adulte</th>
              <th className="px-4 py-3 text-left font-medium text-stone-500">Tarif enfant</th>
              <th className="px-4 py-3 text-left font-medium text-stone-500">Créneaux</th>
              <th className="px-4 py-3 text-right font-medium text-stone-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {visites.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                  Aucune visite pour le moment.
                </td>
              </tr>
            ) : (
              visites.map((visite) => (
                <tr key={visite.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-900">{visite.nom}</p>
                    <p className="text-xs text-stone-400">{visite.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        visite.visible
                          ? "bg-green-100 text-green-700"
                          : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {visite.visible ? "Visible" : "Masquée"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-700">{formatEuros(visite.tarifAdulte)}</td>
                  <td className="px-4 py-3 text-stone-700">{formatEuros(visite.tarifEnfant)}</td>
                  <td className="px-4 py-3 text-stone-700">{visite._count.creneaux}</td>
                  <td className="px-4 py-3">
                    <VisiteRowActions visiteId={visite.id} visible={visite.visible} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
