import Link from "next/link";
import { prisma } from "@/lib/prisma";
import HeaderCarousel from "@/components/public/HeaderCarousel";
import SoundToggle from "@/components/public/SoundToggle";
import BlocsContenu from "@/components/public/BlocsContenu";

// Reads SiteSettings directly — admin can change header/background at any
// time, and this must never be statically prerendered (see (public)/page.tsx
// for the full rationale, incl. avoiding a DATABASE_URL-at-build issue). Same
// reasoning applies to the carrousel photos and BlocContenu entries fetched
// below: both are admin-editable and must reflect changes immediately.
export const dynamic = "force-dynamic";

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

  const siteName = settings?.siteName ?? "Visites guidées théâtralisées";

  return (
    <div
      className="flex min-h-full flex-1 flex-col bg-cover bg-center bg-fixed"
      style={
        settings?.backgroundImageUrl
          ? { backgroundImage: `url(${settings.backgroundImageUrl})` }
          : undefined
      }
    >
      <header className="border-t-8 border-moss-dark bg-cream">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5">
          <Link href="/" className="flex items-center gap-4">
            {settings?.headerImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.headerImageUrl} alt="" className="h-12 w-auto" />
            ) : null}
            <span className="font-display text-2xl font-bold leading-tight text-moss-dark sm:text-3xl">
              {siteName}
            </span>
          </Link>
          <div className="flex items-center gap-5">
            <nav className="flex items-center gap-6 text-base">
              <Link
                href="/"
                className="underline-offset-8 transition-colors duration-150 hover:text-moss hover:underline"
              >
                Nos visites
              </Link>
              {settings?.emailContact ? (
                <a
                  href={`mailto:${settings.emailContact}`}
                  className="hidden underline-offset-8 transition-colors duration-150 hover:text-moss hover:underline sm:inline"
                >
                  Nous écrire
                </a>
              ) : null}
            </nav>
            {settings?.sonAmbianceUrl ? (
              <SoundToggle url={settings.sonAmbianceUrl} nom={settings.sonAmbianceNom} />
            ) : null}
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4">
          <div className="h-[3px] border-y border-ink/40" />
        </div>
      </header>

      <HeaderCarousel photos={photos} />

      {blocs.length > 0 ? (
        <div className="mx-auto w-full max-w-6xl px-4 pt-10">
          <BlocsContenu blocs={blocs} />
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:py-14">{children}</main>

      <footer className="border-t-8 border-moss-dark bg-ink text-cream/80">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          <div className="space-y-2">
            <p className="font-display text-xl font-bold text-cream">{siteName}</p>
            <p className="text-sm text-cream/60">Visites guidées théâtralisées.</p>
          </div>
          <div className="space-y-1 text-sm">
            <p className="font-display text-base font-bold text-straw">Contact</p>
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
            {settings?.adresseSiege ? (
              <p className="whitespace-pre-line text-cream/60">{settings.adresseSiege}</p>
            ) : null}
          </div>
          <div className="space-y-1 text-sm">
            <p className="font-display text-base font-bold text-straw">Naviguer</p>
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
        <div className="border-t border-cream/15 py-4 text-center text-xs text-cream/50">
          © {new Date().getFullYear()} {settings?.raisonSociale ?? siteName}
        </div>
      </footer>
    </div>
  );
}
