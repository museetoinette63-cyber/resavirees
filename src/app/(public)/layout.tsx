import Link from "next/link";
import { prisma } from "@/lib/prisma";
import HeaderCarousel from "@/components/public/HeaderCarousel";
import SoundToggle from "@/components/public/SoundToggle";
import BlocsContenu from "@/components/public/BlocsContenu";
import { Fleuron } from "@/components/public/Ornaments";

// Reads SiteSettings directly — admin can change header/background at any
// time, and this must never be statically prerendered (see (public)/page.tsx
// for the full rationale, incl. avoiding a DATABASE_URL-at-build issue). Same
// reasoning applies to the carrousel photos and BlocContenu entries fetched
// below: both are admin-editable and must reflect changes immediately.
export const dynamic = "force-dynamic";

const NOM_PAR_DEFAUT = "Visites guidées théâtralisées";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [settings, photos, blocs] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: 1 } }),
    prisma.photoCarrousel.findMany({
      where: { actif: true },
      orderBy: { ordre: "asc" },
      select: { id: true, url: true, legende: true },
    }),
    prisma.blocContenu.findMany({
      where: { emplacement: "SITE_ENTIER", actif: true },
      orderBy: { ordre: "asc" },
      select: { id: true, type: true, titre: true, contenu: true, imageUrl: true },
    }),
  ]);

  const siteName = settings?.siteName ?? NOM_PAR_DEFAUT;
  const lienNav =
    "underline-offset-[10px] transition-colors duration-150 hover:text-wine hover:underline decoration-ochre decoration-2";

  return (
    <div
      className="flex min-h-full flex-1 flex-col bg-cover bg-center bg-fixed font-body text-[1.2rem]"
      style={
        settings?.backgroundImageUrl
          ? { backgroundImage: `url(${settings.backgroundImageUrl})` }
          : undefined
      }
    >
      <header>
        <div className="frise-arcature" aria-hidden="true" />
        <div className="mx-auto max-w-6xl px-4 pb-5 pt-9 text-center">
          {settings?.headerImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.headerImageUrl} alt="" className="mx-auto mb-4 h-20 w-auto" />
          ) : null}
          <Link href="/" className="inline-block">
            <span className="font-title text-3xl font-black leading-tight text-wine-dark sm:text-5xl">
              {siteName}
            </span>
          </Link>
          <Fleuron className="mx-auto mt-4 h-6 w-64 text-ochre" />
        </div>
        <div className="border-y-[3px] border-double border-ochre bg-cream-2/60">
          <div className="relative mx-auto flex max-w-6xl items-center justify-center gap-6 px-4 py-3 font-display text-base uppercase tracking-[0.25em] sm:gap-8">
            <Link href="/" className={lienNav}>
              Nos visites
            </Link>
            {settings?.emailContact ? (
              <>
                <span aria-hidden="true" className="h-2 w-2 rotate-45 bg-ochre" />
                <a href={`mailto:${settings.emailContact}`} className={lienNav}>
                  Nous écrire
                </a>
              </>
            ) : null}
            {settings?.sonAmbianceUrl ? (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <SoundToggle url={settings.sonAmbianceUrl} nom={settings.sonAmbianceNom} />
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <HeaderCarousel photos={photos} />

      {blocs.length > 0 ? (
        <div className="mx-auto w-full max-w-6xl px-4 pt-10">
          <BlocsContenu blocs={blocs} />
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:py-16">{children}</main>

      <footer className="mt-10 bg-wine-dark text-cream/85">
        <div className="frise-arcature" aria-hidden="true" />
        <div className="mx-auto max-w-6xl px-4 py-12 text-center">
          <Fleuron className="mx-auto h-6 w-64 text-straw" />
          <p className="mt-4 font-title text-2xl font-bold text-straw sm:text-3xl">{siteName}</p>
          <div className="mt-8 grid gap-8 text-lg sm:grid-cols-3">
            <div className="space-y-1">
              <p className="font-display text-xl text-straw">Contact</p>
              {settings?.emailContact ? (
                <p>
                  <a
                    href={`mailto:${settings.emailContact}`}
                    className="underline-offset-4 transition-colors duration-150 hover:text-straw hover:underline"
                  >
                    {settings.emailContact}
                  </a>
                </p>
              ) : null}
              {settings?.telephoneContact ? <p>{settings.telephoneContact}</p> : null}
            </div>
            <div className="space-y-1">
              <p className="font-display text-xl text-straw">Adresse</p>
              {settings?.adresseSiege ? (
                <p className="whitespace-pre-line text-cream/70">{settings.adresseSiege}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <p className="font-display text-xl text-straw">Naviguer</p>
              <p>
                <Link
                  href="/"
                  className="underline-offset-4 transition-colors duration-150 hover:text-straw hover:underline"
                >
                  Nos visites
                </Link>
              </p>
            </div>
          </div>
        </div>
        <div className="border-t border-straw/25 py-4 text-center text-sm text-cream/55">
          © {new Date().getFullYear()} {settings?.raisonSociale ?? siteName}
        </div>
      </footer>
    </div>
  );
}
