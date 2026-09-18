import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatEuros } from "@/lib/formatMoney";

export default async function CataloguePage() {
  const visites = await prisma.visite.findMany({
    where: { visible: true },
    orderBy: { nom: "asc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Nos visites guidées théâtralisées</h1>
        <p className="mt-2 text-stone-600">
          Découvrez nos parcours et réservez votre créneau en ligne.
        </p>
      </div>

      {visites.length === 0 ? (
        <p className="rounded-lg border border-stone-200 bg-white p-6 text-center text-stone-500">
          Aucune visite n&apos;est disponible à la réservation pour le moment. Revenez bientôt !
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {visites.map((visite) => (
            <Link
              key={visite.id}
              href={`/visites/${visite.slug}`}
              className="group overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm transition hover:shadow-md"
            >
              {visite.imageBanniereUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={visite.imageBanniereUrl}
                  alt={visite.nom}
                  className="h-44 w-full object-cover"
                />
              ) : (
                <div className="flex h-44 w-full items-center justify-center bg-stone-100 text-sm text-stone-400">
                  Pas d&apos;image
                </div>
              )}
              <div className="space-y-2 p-5">
                <h2 className="text-lg font-semibold text-stone-900 group-hover:underline">
                  {visite.nom}
                </h2>
                <p className="line-clamp-3 text-sm text-stone-600">{visite.description}</p>
                <p className="pt-1 text-sm font-medium text-stone-900">
                  Adulte {formatEuros(visite.tarifAdulte)} · Enfant {formatEuros(visite.tarifEnfant)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
