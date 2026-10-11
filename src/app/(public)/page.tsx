import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatEuros } from "@/lib/formatMoney";
import BlocsContenu from "@/components/public/BlocsContenu";
import PhotoFrame from "@/components/public/PhotoFrame";

// Availability/visibility can change at any moment via the back-office, and
// this queries the DB directly — never statically prerender it (also avoids
// needing DATABASE_URL to be resolvable at build time, e.g. on Vercel).
export const dynamic = "force-dynamic";

const ETAPES = [
  { titre: "Choisissez une visite", texte: "Parcourez nos parcours théâtralisés et trouvez celui qui vous tente." },
  { titre: "Sélectionnez une date", texte: "Le calendrier n'affiche que les créneaux réellement disponibles." },
  { titre: "Envoyez votre demande", texte: "Nous validons puis vous adressons un devis détaillé par e-mail." },
];

export default async function CataloguePage() {
  const [visites, blocs] = await Promise.all([
    prisma.visite.findMany({
      where: { visible: true },
      orderBy: { nom: "asc" },
    }),
    prisma.blocContenu.findMany({
      where: { emplacement: "ACCUEIL", actif: true },
      orderBy: { ordre: "asc" },
      select: { id: true, type: true, titre: true, contenu: true, imageUrl: true },
    }),
  ]);

  return (
    <div className="space-y-16">
      <section className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">
          Visites guidées théâtralisées
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-rust-dark sm:text-5xl lg:text-6xl">
          Quand l&apos;histoire <span className="italic text-rust">prend vie</span> sous vos yeux
        </h1>
        <div className="mx-auto mt-6 flex items-center justify-center gap-3 text-gold" aria-hidden="true">
          <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold" />
          <span>✦</span>
          <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold" />
        </div>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
          Découvrez nos parcours et réservez votre créneau en ligne.
        </p>
      </section>

      <BlocsContenu blocs={blocs} />

      <section aria-labelledby="visites-titre" className="space-y-8">
        <h2 id="visites-titre" className="text-center font-display text-3xl font-semibold tracking-tight text-rust-dark">
          Nos visites
        </h2>

        {visites.length === 0 ? (
          <p className="rounded-2xl border-2 border-border-warm bg-cream-2 p-8 text-center text-ink-soft">
            Aucune visite n&apos;est disponible à la réservation pour le moment. Revenez bientôt !
          </p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {visites.map((visite, i) => (
              <Link
                key={visite.id}
                href={`/visites/${visite.slug}`}
                style={{ animationDelay: `${i * 70}ms` }}
                className="group flex animate-fade-in-up flex-col overflow-hidden rounded-3xl border border-border-warm bg-cream-2 shadow-[0_18px_40px_-26px_rgba(46,33,24,0.55)] transition-[transform,box-shadow] duration-300 ease-snappy hover:-translate-y-1.5 hover:shadow-[0_28px_50px_-24px_rgba(156,59,34,0.45)] active:translate-y-0 active:scale-[0.99]"
              >
                {visite.imageBanniereUrl ? (
                  <PhotoFrame src={visite.imageBanniereUrl} alt={visite.nom} className="aspect-[4/3] w-full" />
                ) : (
                  <div
                    aria-hidden="true"
                    className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-gold-light/60 via-cream-2 to-rust/20 font-display text-5xl text-gold"
                  >
                    ✦
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-3 p-6">
                  <h3 className="font-display text-2xl font-semibold leading-tight tracking-tight text-ink transition-colors duration-150 ease-snappy group-hover:text-rust-dark">
                    {visite.nom}
                  </h3>
                  <p className="line-clamp-3 text-sm leading-relaxed text-ink-soft">{visite.description}</p>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="rounded-full bg-gold-light/50 px-3 py-1 text-rust-dark">
                        Adulte {formatEuros(visite.tarifAdulte)}
                      </span>
                      <span className="rounded-full bg-gold-light/50 px-3 py-1 text-rust-dark">
                        Enfant {formatEuros(visite.tarifEnfant)}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-rust">
                      Voir les dates
                      <span className="inline-block transition-transform duration-200 ease-snappy group-hover:translate-x-1">
                        {" "}
                        →
                      </span>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="etapes-titre" className="rounded-3xl bg-ink px-6 py-12 text-cream sm:px-12">
        <h2 id="etapes-titre" className="text-center font-display text-3xl font-semibold tracking-tight">
          Comment réserver ?
        </h2>
        <ol className="mt-10 grid gap-8 sm:grid-cols-3">
          {ETAPES.map((etape, i) => (
            <li key={etape.titre} className="space-y-3 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-gold font-display text-xl text-gold-light">
                {i + 1}
              </span>
              <h3 className="font-display text-lg font-semibold text-gold-light">{etape.titre}</h3>
              <p className="text-sm leading-relaxed text-cream/70">{etape.texte}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
