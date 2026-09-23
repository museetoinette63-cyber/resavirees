import Link from "next/link";
import { prisma } from "@/lib/prisma";

// Reads SiteSettings directly — admin can change header/background at any
// time, and this must never be statically prerendered (see (public)/page.tsx
// for the full rationale, incl. avoiding a DATABASE_URL-at-build issue).
export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } });

  return (
    <div
      className="flex min-h-full flex-1 flex-col bg-cover bg-center bg-fixed"
      style={
        settings?.backgroundImageUrl
          ? { backgroundImage: `url(${settings.backgroundImageUrl})` }
          : undefined
      }
    >
      <header className="border-b-2 border-rust/20 bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            {settings?.headerImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.headerImageUrl}
                alt={settings.siteName ?? "Logo"}
                className="h-10 w-auto"
              />
            ) : null}
            <span className="font-display text-xl font-semibold tracking-tight text-rust-dark">
              {settings?.siteName ?? "Visites guidées théâtralisées"}
            </span>
          </Link>
          <nav className="text-sm">
            <Link
              href="/"
              className="font-medium text-ink-soft transition-colors hover:text-rust"
            >
              Nos visites
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>

      <footer className="border-t-2 border-rust/20 bg-cream/95 py-6 text-center text-sm text-ink-soft">
        {settings?.siteName ?? "Visites guidées théâtralisées"}
      </footer>
    </div>
  );
}
