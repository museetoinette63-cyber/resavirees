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
        <p className="rounded-md border-2 border-gold bg-gold-light/30 px-4 py-3 text-sm text-rust-dark">
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
        <h1 className="font-display text-3xl font-semibold tracking-tight text-rust-dark">
          {visite.nom}
        </h1>
        <p className="mt-4 whitespace-pre-line text-ink-soft">{visite.description}</p>
      </div>

      <div className="flex flex-wrap gap-4 rounded-lg border-2 border-border-warm bg-cream-2 p-4 text-sm">
        <p className="text-ink-soft">
          <span className="font-medium text-ink">Tarif adulte :</span>{" "}
          {formatEuros(visite.tarifAdulte)}
        </p>
        <p className="text-ink-soft">
          <span className="font-medium text-ink">Tarif enfant :</span>{" "}
          {formatEuros(visite.tarifEnfant)}
        </p>
      </div>

      <section>
        <h2 className="mb-4 font-display text-xl font-semibold text-rust-dark">
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
