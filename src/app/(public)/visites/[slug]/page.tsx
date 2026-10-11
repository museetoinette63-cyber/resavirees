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
        <p className="rounded-md border-2 border-gold bg-gold-light/30 px-4 py-3 text-sm text-rust-dark">
          Ce créneau vient d&apos;être réservé par quelqu&apos;un d&apos;autre. Merci d&apos;en choisir un
          nouveau ci-dessous.
        </p>
      ) : null}

      {visite.imageBanniereUrl ? (
        <PhotoFrame
          src={visite.imageBanniereUrl}
          alt={visite.nom}
          className="aspect-[16/10] max-h-[70vh] w-full rounded-3xl border border-border-warm shadow-[0_24px_50px_-28px_rgba(46,33,24,0.55)] sm:aspect-[2/1]"
        />
      ) : null}

      <div className="max-w-3xl">
        <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-rust-dark sm:text-5xl">
          {visite.nom}
        </h1>
        <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold">
          <span className="rounded-full bg-gold-light/50 px-4 py-1.5 text-rust-dark">
            Adulte {formatEuros(visite.tarifAdulte)}
          </span>
          <span className="rounded-full bg-gold-light/50 px-4 py-1.5 text-rust-dark">
            Enfant {formatEuros(visite.tarifEnfant)}
          </span>
        </div>
        <p className="mt-6 whitespace-pre-line text-lg leading-relaxed text-ink-soft">
          {visite.description}
        </p>
      </div>

      <section>
        <h2 className="mb-5 font-display text-3xl font-semibold tracking-tight text-rust-dark">
          Choisissez une date
        </h2>
        {creneauxSerialises.length > 0 ? (
          <CalendrierMensuel visiteSlug={visite.slug} creneaux={creneauxSerialises} />
        ) : (
          <p className="rounded-lg border-2 border-border-warm bg-cream-2 p-6 text-center text-ink-soft">
            Aucun créneau n&apos;est disponible pour le moment. Revenez bientôt !
          </p>
        )}
      </section>
    </article>
  );
}
