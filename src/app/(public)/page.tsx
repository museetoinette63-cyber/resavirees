import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatEuros } from "@/lib/formatMoney";

// Availability/visibility can change at any moment via the back-office, and
// this queries the DB directly — never statically prerender it (also avoids
// needing DATABASE_URL to be resolvable at build time, e.g. on Vercel).
export const dynamic = "force-dynamic";

export default async function CataloguePage() {
  const visites = await prisma.visite.findMany({
    where: { visible: true },
    orderBy: { nom: "asc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-rust-dark">
          Nos visites guidées théâtralisées
        </h1>
        <p className="mt-2 text-ink-soft">
          Découvrez nos parcours et réservez votre créneau en ligne.
        </p>
      </div>

      {visites.length === 0 ? (
        <p className="rounded-lg border-2 border-border-warm bg-cream-2 p-6 text-center text-ink-soft">
          Aucune visite n&apos;est disponible à la réservation pour le moment. Revenez bientôt !
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {visites.map((visite) => (
            <Link
              key={visite.id}
              href={`/visites/${visite.slug}`}
              className="group overflow-hidden rounded-lg border-2 border-border-warm bg-cream-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-rust/10"
            >
              {visite.imageBanniereUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={visite.imageBanniereUrl}
                  alt={visite.nom}
                  className="h-44 w-full object-cover"
                />
              ) : (
                <div className="flex h-44 w-full items-center justify-center bg-gold-light/30 text-sm text-ink-soft">
                  Pas d&apos;image
                </div>
              )}
              <div className="space-y-2 p-5">
                <h2 className="font-display text-lg font-semibold text-ink group-hover:text-rust-dark">
                  {visite.nom}
                </h2>
                <p className="line-clamp-3 text-sm text-ink-soft">{visite.description}</p>
                <p className="pt-1 text-sm font-medium text-rust-dark">
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
