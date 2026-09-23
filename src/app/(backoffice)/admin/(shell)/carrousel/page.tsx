import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CarrouselDeleteButton from "./CarrouselDeleteButton";

export default async function AdminCarrouselPage() {
  const photos = await prisma.photoCarrousel.findMany({
    orderBy: { ordre: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Carrousel photo</h1>
          <p className="mt-1 text-sm text-stone-500">
            Photos affichées en diaporama dans l&apos;en-tête du site public.
          </p>
        </div>
        <Link
          href="/admin/carrousel/nouveau"
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          + Nouvelle photo
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-stone-200 text-sm">
          <thead className="bg-stone-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-stone-500">Aperçu</th>
              <th className="px-4 py-3 text-left font-medium text-stone-500">Légende</th>
              <th className="px-4 py-3 text-left font-medium text-stone-500">Ordre</th>
              <th className="px-4 py-3 text-left font-medium text-stone-500">Statut</th>
              <th className="px-4 py-3 text-right font-medium text-stone-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {photos.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-stone-400">
                  Aucune photo pour le moment.
                </td>
              </tr>
            ) : (
              photos.map((photo) => (
                <tr key={photo.id}>
                  <td className="px-4 py-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.legende ?? ""}
                      className="h-12 w-20 rounded-md object-cover"
                    />
                  </td>
                  <td className="px-4 py-3 text-stone-700">{photo.legende ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-700">{photo.ordre}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        photo.actif
                          ? "bg-green-100 text-green-700"
                          : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {photo.actif ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-start justify-end gap-3">
                      <Link
                        href={`/admin/carrousel/${photo.id}`}
                        className="text-sm text-stone-600 underline hover:text-stone-900"
                      >
                        Modifier
                      </Link>
                      <CarrouselDeleteButton photoId={photo.id} />
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
