import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatEuros } from "@/lib/formatMoney";
import CalendrierMensuel from "@/components/public/CalendrierMensuel";

// Créneau availability changes constantly — must always be rendered fresh,
// never statically prerendered (see (public)/page.tsx for full rationale).
export const dynamic = "force-dynamic";

export default async function VisiteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ indisponible?: string }>;
}) {
  const { slug } = await params;
  const { indisponible } = await searchParams;

  const visite = await prisma.visite.findUnique({ where: { slug } });
  if (!visite || !visite.visible) {
    notFound();
  }

  const creneaux = await prisma.creneau.findMany({
    where: { visiteId: visite.id, status: "PUBLIE" },
    orderBy: { dateHeure: "asc" },
    select: { id: true, dateHeure: true },
  });

  const creneauxSerialises = creneaux.map((creneau) => ({
    id: creneau.id,
    dateHeure: creneau.dateHeure.toISOString(),
  }));

  return (
    <article className="space-y-8">
      {indisponible ? (
        <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Ce créneau vient d&apos;être réservé par quelqu&apos;un d&apos;autre. Merci d&apos;en choisir un
          nouveau ci-dessous.
        </p>
      ) : null}

      {visite.imageBanniereUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={visite.imageBanniereUrl}
          alt={visite.nom}
          className="h-64 w-full rounded-lg object-cover"
        />
      ) : null}

      <div>
        <h1 className="text-2xl font-semibold text-stone-900">{visite.nom}</h1>
        <p className="mt-4 whitespace-pre-line text-stone-700">{visite.description}</p>
      </div>

      <div className="flex flex-wrap gap-4 rounded-lg border border-stone-200 bg-white p-4 text-sm">
        <p className="text-stone-700">
          <span className="font-medium text-stone-900">Tarif adulte :</span>{" "}
          {formatEuros(visite.tarifAdulte)}
        </p>
        <p className="text-stone-700">
          <span className="font-medium text-stone-900">Tarif enfant :</span>{" "}
          {formatEuros(visite.tarifEnfant)}
        </p>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-stone-900">Choisissez une date</h2>
        {creneauxSerialises.length > 0 ? (
          <CalendrierMensuel visiteSlug={visite.slug} creneaux={creneauxSerialises} />
        ) : (
          <p className="rounded-lg border border-stone-200 bg-white p-6 text-center text-stone-500">
            Aucun créneau n&apos;est disponible pour le moment. Revenez bientôt !
          </p>
        )}
      </section>
    </article>
  );
}
