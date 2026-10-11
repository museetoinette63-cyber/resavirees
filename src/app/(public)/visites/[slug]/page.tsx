import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatEuros } from "@/lib/formatMoney";
import CalendrierMensuel from "@/components/public/CalendrierMensuel";
import PhotoFrame from "@/components/public/PhotoFrame";

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
        <p className="rounded-sm border-2 border-ochre bg-straw/30 px-4 py-3 text-sm text-moss-dark">
          Ce créneau vient d&apos;être réservé par quelqu&apos;un d&apos;autre. Merci d&apos;en choisir un
          nouveau ci-dessous.
        </p>
      ) : null}

      {visite.imageBanniereUrl ? (
        <PhotoFrame
          src={visite.imageBanniereUrl}
          alt={visite.nom}
          className="aspect-[16/10] max-h-[70vh] w-full border border-ink/30 sm:aspect-[2/1]"
        />
      ) : null}

      <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
        <div>
          <h1 className="font-display text-4xl font-bold leading-tight text-moss-dark md:text-5xl">
            {visite.nom}
          </h1>
          <p className="mt-6 whitespace-pre-line text-lg text-ink-soft">{visite.description}</p>
        </div>
        <dl className="h-fit space-y-2 border-t-4 border-moss-dark bg-cream-2 p-5 text-base">
          <div className="flex items-baseline gap-2">
            <dt>Adulte</dt>
            <span className="flex-1 border-b border-dotted border-ink/40" aria-hidden="true" />
            <dd className="font-semibold tabular-nums">{formatEuros(visite.tarifAdulte)}</dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt>Enfant</dt>
            <span className="flex-1 border-b border-dotted border-ink/40" aria-hidden="true" />
            <dd className="font-semibold tabular-nums">{formatEuros(visite.tarifEnfant)}</dd>
          </div>
        </dl>
      </div>

      <section>
        <h2 className="mb-5 flex items-center gap-4 font-display text-2xl font-bold text-moss-dark">
          <span>Choisissez une date</span>
          <span className="h-px flex-1 bg-ink/30" aria-hidden="true" />
        </h2>
        {creneauxSerialises.length > 0 ? (
          <CalendrierMensuel visiteSlug={visite.slug} creneaux={creneauxSerialises} />
        ) : (
          <p className="rounded-sm border-2 border-border-stone bg-cream-2 p-6 text-center text-ink-soft">
            Aucun créneau n&apos;est disponible pour le moment. Revenez bientôt !
          </p>
        )}
      </section>
    </article>
  );
}
