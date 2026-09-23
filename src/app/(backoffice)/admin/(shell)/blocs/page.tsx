import Link from "next/link";
import { prisma } from "@/lib/prisma";
import BlocDeleteButton from "./BlocDeleteButton";

const TYPE_LABELS: Record<string, string> = {
  TEXTE: "Texte",
  TEXTE_IMAGE: "Texte + image",
  ENCART: "Encart",
};

const EMPLACEMENT_LABELS: Record<string, string> = {
  ACCUEIL: "Accueil",
  SITE_ENTIER: "Site entier",
};

export default async function AdminBlocsPage() {
  const blocs = await prisma.blocContenu.findMany({
    orderBy: [{ emplacement: "asc" }, { ordre: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Contenu du site</h1>
          <p className="mt-1 text-sm text-stone-500">
            Blocs de texte et encarts affichés sur le site public (accueil ou toutes les pages).
          </p>
        </div>
        <Link
          href="/admin/blocs/nouveau"
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          + Nouveau bloc
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-stone-200 text-sm">
          <thead className="bg-stone-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-stone-500">Titre</th>
              <th className="px-4 py-3 text-left font-medium text-stone-500">Type</th>
              <th className="px-4 py-3 text-left font-medium text-stone-500">Emplacement</th>
              <th className="px-4 py-3 text-left font-medium text-stone-500">Ordre</th>
              <th className="px-4 py-3 text-left font-medium text-stone-500">Statut</th>
              <th className="px-4 py-3 text-right font-medium text-stone-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {blocs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                  Aucun bloc de contenu pour le moment.
                </td>
              </tr>
            ) : (
              blocs.map((bloc) => (
                <tr key={bloc.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-900">{bloc.titre ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-stone-700">{TYPE_LABELS[bloc.type] ?? bloc.type}</td>
                  <td className="px-4 py-3 text-stone-700">
                    {EMPLACEMENT_LABELS[bloc.emplacement] ?? bloc.emplacement}
                  </td>
                  <td className="px-4 py-3 text-stone-700">{bloc.ordre}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        bloc.actif
                          ? "bg-green-100 text-green-700"
                          : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {bloc.actif ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-start justify-end gap-3">
                      <Link
                        href={`/admin/blocs/${bloc.id}`}
                        className="text-sm text-stone-600 underline hover:text-stone-900"
                      >
                        Modifier
                      </Link>
                      <BlocDeleteButton blocId={bloc.id} />
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
