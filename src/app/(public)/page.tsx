import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatEuros } from "@/lib/formatMoney";
import BlocsContenu from "@/components/public/BlocsContenu";
import PhotoFrame from "@/components/public/PhotoFrame";
import { CadreOrne, Fleuron, Medaillon, NicheArcade, romain } from "@/components/public/Ornaments";

// Availability/visibility can change at any moment via the back-office, and
// this queries the DB directly — never statically prerender it (also avoids
// needing DATABASE_URL to be resolvable at build time, e.g. on Vercel).
export const dynamic = "force-dynamic";

const ETAPES = [
  { titre: "Choisir une visite", texte: "Parcourez nos parcours théâtralisés et retenez celui qui vous convient." },
  { titre: "Choisir une date", texte: "Le calendrier n'affiche que les créneaux réellement disponibles." },
  { titre: "Envoyer votre demande", texte: "Nous la validons puis vous adressons un devis détaillé par e-mail." },
];

function formatDuree(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  return reste === 0 ? `${heures} h` : `${heures} h ${String(reste).padStart(2, "0")}`;
}

function Rubrique({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div className="text-center">
      <h2 id={id} className="font-display text-4xl text-wine-dark">
        {children}
      </h2>
      <Fleuron className="mx-auto mt-2 h-6 w-56 text-ochre" />
    </div>
  );
}

export default async function CataloguePage() {
  const [visites, produits, settings, blocs] = await Promise.all([
    prisma.visite.findMany({
      where: { visible: true },
      orderBy: { nom: "asc" },
    }),
    prisma.produit.findMany({
      where: { actif: true, afficherSurSite: true },
      orderBy: { nom: "asc" },
    }),
    prisma.siteSettings.findUnique({ where: { id: 1 }, select: { emailContact: true } }),
    prisma.blocContenu.findMany({
      where: { emplacement: "ACCUEIL", actif: true },
      orderBy: { ordre: "asc" },
      select: { id: true, type: true, titre: true, contenu: true, imageUrl: true },
    }),
  ]);

  return (
    <div className="space-y-20">
      <section className="mx-auto max-w-3xl text-center">
        <h1 className="font-title text-4xl font-black leading-tight text-wine-dark md:text-6xl">
          Nos visites guidées théâtralisées
        </h1>
        <p className="mt-6 font-display text-2xl italic text-ink-soft">
          Découvrez nos parcours et réservez votre créneau en ligne.
        </p>
      </section>

      <BlocsContenu blocs={blocs} />

      <section aria-labelledby="visites-titre" className="space-y-10">
        <Rubrique id="visites-titre">Nos visites</Rubrique>

        {visites.length === 0 ? (
          <p className="mx-auto max-w-xl border-[3px] border-double border-ochre bg-cream-2/70 p-8 text-center text-ink-soft">
            Aucune visite n&apos;est disponible à la réservation pour le moment. Revenez bientôt !
          </p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {visites.map((visite, i) => (
              <Link
                key={visite.id}
                href={`/visites/${visite.slug}`}
                style={{ animationDelay: `${i * 70}ms` }}
                className="group block animate-fade-in-up"
              >
                <CadreOrne
                  size="sm"
                  className="flex h-full flex-col bg-cream/70 transition-colors duration-200 ease-snappy group-hover:border-wine"
                >
                  <NicheArcade>
                    {visite.imageBanniereUrl ? (
                      <PhotoFrame
                        src={visite.imageBanniereUrl}
                        alt={visite.nom}
                        className="aspect-[4/3] w-full"
                      />
                    ) : (
                      <div className="flex aspect-[4/3] w-full items-center justify-center bg-cream-2 px-6 text-center font-display text-xl italic text-ink-soft">
                        Photographie à venir
                      </div>
                    )}
                  </NicheArcade>
                  <div className="flex flex-1 flex-col gap-3 pt-5 text-center">
                    <h3 className="font-display text-3xl leading-tight text-wine-dark">{visite.nom}</h3>
                    <p className="line-clamp-3 text-lg text-ink-soft">{visite.description}</p>
                    <dl className="mt-auto space-y-1 pt-3 text-left text-base">
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
                    <span className="mt-2 inline-block self-center border-2 border-ochre bg-wine px-6 py-2 font-display text-lg tracking-wide text-cream transition-colors duration-150 ease-snappy group-hover:bg-wine-dark">
                      Consulter les dates
                    </span>
                  </div>
                </CadreOrne>
              </Link>
            ))}
          </div>
        )}
      </section>

      {produits.length > 0 ? (
        <section aria-labelledby="prestations-titre" className="space-y-10">
          <Rubrique id="prestations-titre">Nos prestations</Rubrique>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {produits.map((produit) => (
              <CadreOrne key={produit.id} size="sm" className="flex flex-col bg-cream/70">
                {produit.imageUrl ? (
                  <NicheArcade>
                    <PhotoFrame src={produit.imageUrl} alt={produit.nom} className="aspect-[4/3] w-full" />
                  </NicheArcade>
                ) : null}
                <div className="flex flex-1 flex-col gap-3 pt-5 text-center">
                  <h3 className="font-display text-3xl leading-tight text-wine-dark">{produit.nom}</h3>
                  {produit.description ? (
                    <p className="whitespace-pre-line text-lg text-ink-soft">{produit.description}</p>
                  ) : null}
                  <p className="mt-auto pt-2 font-semibold">
                    {formatEuros(produit.prixUnitaire)}
                    {produit.dureeMinutes ? ` · ${formatDuree(produit.dureeMinutes)}` : ""}
                  </p>
                  {settings?.emailContact ? (
                    <a
                      href={`mailto:${settings.emailContact}?subject=${encodeURIComponent(produit.nom)}`}
                      className="mt-1 inline-block self-center border-2 border-ochre bg-wine px-6 py-2 font-display text-lg tracking-wide text-cream transition-colors duration-150 ease-snappy hover:bg-wine-dark"
                    >
                      Nous contacter
                    </a>
                  ) : null}
                </div>
              </CadreOrne>
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="etapes-titre" className="space-y-10">
        <Rubrique id="etapes-titre">Pour réserver</Rubrique>
        <ol className="grid gap-10 sm:grid-cols-3">
          {ETAPES.map((etape, i) => (
            <li key={etape.titre} className="space-y-3 text-center">
              <Medaillon>{romain(i + 1)}</Medaillon>
              <h3 className="font-display text-2xl text-wine-dark">{etape.titre}</h3>
              <p className="text-lg text-ink-soft">{etape.texte}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
