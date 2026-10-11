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
  { titre: "Choisir une visite", texte: "Parcourez nos parcours théâtralisés et retenez celui qui vous convient." },
  { titre: "Choisir une date", texte: "Le calendrier n'affiche que les créneaux réellement disponibles." },
  { titre: "Envoyer votre demande", texte: "Nous la validons puis vous adressons un devis détaillé par e-mail." },
];

function Rubrique({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="flex items-center gap-4 font-display text-2xl font-bold text-moss-dark">
      <span>{children}</span>
      <span className="h-px flex-1 bg-ink/30" aria-hidden="true" />
    </h2>
  );
}

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
    <div className="space-y-14">
      <section className="grid gap-4 md:grid-cols-[3fr_2fr] md:items-end md:gap-12">
        <h1 className="font-display text-4xl font-bold leading-tight text-moss-dark md:text-5xl">
          Nos visites guidées théâtralisées
        </h1>
        <p className="text-lg text-ink-soft">
          Découvrez nos parcours et réservez votre créneau en ligne.
        </p>
      </section>

      <BlocsContenu blocs={blocs} />

      <section aria-labelledby="visites-titre" className="space-y-6">
        <Rubrique id="visites-titre">Nos visites</Rubrique>

        {visites.length === 0 ? (
          <p className="border border-border-stone bg-cream-2 p-6 text-ink-soft">
            Aucune visite n&apos;est disponible à la réservation pour le moment. Revenez bientôt !
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visites.map((visite, i) => (
              <Link
                key={visite.id}
                href={`/visites/${visite.slug}`}
                style={{ animationDelay: `${i * 60}ms` }}
                className="group flex animate-fade-in-up flex-col border border-ink/30 bg-cream transition-colors duration-200 ease-snappy hover:border-moss-dark"
              >
                {visite.imageBanniereUrl ? (
                  <PhotoFrame src={visite.imageBanniereUrl} alt={visite.nom} className="aspect-[4/3] w-full" />
                ) : (
                  <div className="flex aspect-[4/3] w-full items-center justify-center bg-cream-2 font-display italic text-ink-soft">
                    Photographie à venir
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-3 border-t border-ink/30 p-5">
                  <h3 className="font-display text-xl font-bold leading-snug text-ink group-hover:text-moss-dark">
                    {visite.nom}
                  </h3>
                  <p className="line-clamp-3 text-base text-ink-soft">{visite.description}</p>
                  <dl className="mt-auto space-y-1 pt-3 text-sm">
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
                  <span className="pt-2 font-semibold text-moss underline decoration-1 underline-offset-4">
                    Consulter les dates
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="etapes-titre" className="space-y-6">
        <Rubrique id="etapes-titre">Pour réserver</Rubrique>
        <ol className="grid gap-6 sm:grid-cols-3">
          {ETAPES.map((etape, i) => (
            <li key={etape.titre} className="border-t border-ink/30 pt-4">
              <span className="font-display text-3xl font-bold text-ochre">{i + 1}.</span>
              <h3 className="mt-1 font-display text-lg font-bold">{etape.titre}</h3>
              <p className="mt-1 text-base text-ink-soft">{etape.texte}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
