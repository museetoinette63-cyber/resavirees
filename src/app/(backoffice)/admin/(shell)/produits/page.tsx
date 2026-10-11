import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatEuros } from "@/lib/formatMoney";
import ProduitDeleteButton from "./ProduitDeleteButton";

// "1h", "1h 30min" ou "45 min" — pas de lib partagée requise pour un format
// aussi ciblé (voir AGENTS.md de la tâche : "no need for a shared lib file").
function formatDuree(minutes: number | null): string {
  if (minutes == null) return "—";
  if (minutes < 60) return `${minutes} min`;
  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  return reste === 0 ? `${heures}h` : `${heures}h ${String(reste).padStart(2, "0")}min`;
}

export default async function AdminProduitsPage({
  searchParams,
}: {
  searchParams: Promise<{ enregistre?: string }>;
}) {
  const { enregistre } = await searchParams;
  const produits = await prisma.produit.findMany({
    orderBy: { nom: "asc" },
    include: { visite: { select: { nom: true } } },
  });

  return (
    <div className="space-y-6">
      {enregistre ? (
        <p role="status" className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          ✓ Le produit a bien été enregistré.
        </p>
      ) : null}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-stone-900">Produits</h1>
        <Link
          href="/admin/produits/nouveau"
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          + Nouveau produit
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-stone-200 text-sm">
          <thead className="bg-stone-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-stone-500">Nom</th>
              <th className="px-4 py-3 text-left font-medium text-stone-500">Prix unitaire</th>
              <th className="px-4 py-3 text-left font-medium text-stone-500">Durée</th>
              <th className="px-4 py-3 text-left font-medium text-stone-500">Visite liée</th>
              <th className="px-4 py-3 text-left font-medium text-stone-500">Statut</th>
              <th className="px-4 py-3 text-right font-medium text-stone-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {produits.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                  Aucun produit pour le moment.
                </td>
              </tr>
            ) : (
              produits.map((produit) => (
                <tr key={produit.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {produit.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={produit.imageUrl}
                          alt=""
                          className="h-12 w-16 rounded border border-stone-200 bg-stone-100 object-contain"
                        />
                      ) : null}
                      <p className="font-medium text-stone-900">{produit.nom}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-700">{formatEuros(produit.prixUnitaire)}</td>
                  <td className="px-4 py-3 text-stone-700">{formatDuree(produit.dureeMinutes)}</td>
                  <td className="px-4 py-3 text-stone-700">{produit.visite?.nom ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        produit.actif
                          ? "bg-green-100 text-green-700"
                          : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {produit.actif ? "Actif" : "Inactif"}
                    </span>
                    {produit.afficherSurSite ? (
                      <span className="ml-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Sur le site
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-start justify-end gap-3">
                      <Link
                        href={`/admin/produits/${produit.id}`}
                        className="text-sm text-stone-600 underline hover:text-stone-900"
                      >
                        Modifier
                      </Link>
                      <ProduitDeleteButton produitId={produit.id} />
                    </div>
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
