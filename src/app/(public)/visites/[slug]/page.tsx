import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatEuros } from "@/lib/formatMoney";
import CalendrierMensuel from "@/components/public/CalendrierMensuel";
import PhotoFrame from "@/components/public/PhotoFrame";
import { CadreOrne, Fleuron } from "@/components/public/Ornaments";

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
    <article className="space-y-14">
      {indisponible ? (
        <p className="border-[3px] border-double border-ochre bg-straw/40 px-4 py-3 text-center text-wine-dark">
          Ce créneau vient d&apos;être réservé par quelqu&apos;un d&apos;autre. Merci d&apos;en choisir un
          nouveau ci-dessous.
        </p>
      ) : null}

      {visite.imageBanniereUrl ? (
        <CadreOrne className="bg-cream-2/70">
          <PhotoFrame
            src={visite.imageBanniereUrl}
            alt={visite.nom}
            className="aspect-[16/10] max-h-[70vh] w-full border-2 border-wine-dark sm:aspect-[2/1]"
          />
        </CadreOrne>
      ) : null}

      <header className="text-center">
        <h1 className="font-title text-4xl font-black leading-tight text-wine-dark md:text-6xl">
          {visite.nom}
        </h1>
        <Fleuron className="mx-auto mt-4 h-6 w-64 text-ochre" />
      </header>

      <div className="grid gap-10 md:grid-cols-[2fr_1fr]">
        <p className="whitespace-pre-line text-xl leading-relaxed text-ink-soft first-letter:float-left first-letter:mr-3 first-letter:font-title first-letter:text-7xl first-letter:font-black first-letter:leading-[0.85] first-letter:text-wine">
          {visite.description}
        </p>
        <CadreOrne size="sm" className="h-fit bg-cream/70">
          <p className="mb-3 text-center font-display text-2xl text-wine-dark">Tarifs</p>
          <dl className="space-y-2 text-lg">
            <div className="flex items-baseline gap-2">
              <dt>Adulte</dt>
              <span className="flex-1 border-b-2 border-dotted border-ochre/60" aria-hidden="true" />
              <dd className="font-semibold tabular-nums">{formatEuros(visite.tarifAdulte)}</dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt>Enfant</dt>
              <span className="flex-1 border-b-2 border-dotted border-ochre/60" aria-hidden="true" />
              <dd className="font-semibold tabular-nums">{formatEuros(visite.tarifEnfant)}</dd>
            </div>
          </dl>
        </CadreOrne>
      </div>

      <section className="space-y-8">
        <div className="text-center">
          <h2 className="font-display text-4xl text-wine-dark">Choisissez une date</h2>
          <Fleuron className="mx-auto mt-2 h-6 w-56 text-ochre" />
        </div>
        {creneauxSerialises.length > 0 ? (
          <CalendrierMensuel visiteSlug={visite.slug} creneaux={creneauxSerialises} />
        ) : (
          <p className="border-[3px] border-double border-ochre bg-cream-2/70 p-6 text-center text-ink-soft">
            Aucun créneau n&apos;est disponible pour le moment. Revenez bientôt !
          </p>
        )}
      </section>
    </article>
  );
}
