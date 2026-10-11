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
      <header className="sticky top-0 z-40 border-b border-rust/15 bg-cream/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="group flex items-center gap-3">
            {settings?.headerImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.headerImageUrl} alt="" className="h-11 w-auto" />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gold bg-gold-light/40 font-display text-lg text-rust-dark"
              >
                ✦
              </span>
            )}
            <span className="font-display text-xl font-semibold leading-tight tracking-tight text-rust-dark transition-colors duration-150 ease-snappy group-hover:text-rust sm:text-2xl">
              {siteName}
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-5">
            <nav className="flex items-center gap-1 text-sm font-medium">
              <Link
                href="/"
                className="rounded-full px-4 py-2 text-ink-soft transition-[background-color,color] duration-150 ease-snappy hover:bg-gold-light/40 hover:text-rust-dark"
              >
                Nos visites
              </Link>
              {settings?.emailContact ? (
                <a
                  href={`mailto:${settings.emailContact}`}
                  className="hidden rounded-full border-2 border-rust px-4 py-1.5 text-rust transition-[background-color,color,transform] duration-150 ease-snappy hover:bg-rust hover:text-cream active:scale-95 sm:inline-block"
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
        <div className="h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
      </header>

      <HeaderCarousel photos={photos} />

      {blocs.length > 0 ? (
        <div className="mx-auto w-full max-w-6xl px-4 pt-10">
          <BlocsContenu blocs={blocs} />
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:py-14">{children}</main>

      <footer className="mt-8 bg-ink text-cream/80">
        <div className="h-1 bg-gradient-to-r from-rust via-gold to-rust" />
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
          <div className="space-y-3">
            <p className="font-display text-2xl font-semibold text-cream">{siteName}</p>
            <p className="text-sm leading-relaxed text-cream/60">
              Des visites guidées théâtralisées pour redécouvrir le patrimoine autrement.
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-display text-base font-semibold text-gold-light">Contact</p>
            {settings?.emailContact ? (
              <p>
                <a
                  href={`mailto:${settings.emailContact}`}
                  className="transition-colors duration-150 hover:text-gold-light"
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
          <div className="space-y-2 text-sm">
            <p className="font-display text-base font-semibold text-gold-light">Naviguer</p>
            <p>
              <Link href="/" className="transition-colors duration-150 hover:text-gold-light">
                Nos visites
              </Link>
            </p>
          </div>
        </div>
        <div className="border-t border-cream/10 py-4 text-center text-xs text-cream/50">
          © {new Date().getFullYear()} {settings?.raisonSociale ?? siteName}
        </div>
      </footer>
    </div>
  );
}
