import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/visites", label: "Visites" },
  { href: "/admin/creneaux", label: "Créneaux" },
  { href: "/admin/calendrier", label: "Calendrier" },
  { href: "/admin/reservations", label: "Réservations" },
  { href: "/admin/devis", label: "Devis" },
  { href: "/admin/factures", label: "Factures" },
  { href: "/admin/clients", label: "Comptes clients" },
  { href: "/admin/parametres", label: "Paramètres" },
] as const;

export default async function AdminShellLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Defense in depth: src/proxy.ts already redirects unauthenticated
  // requests to /admin/login before this layout ever runs, but this layout
  // is also reachable via React Server Component navigation, so we re-check.
  if (!session?.user) {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-full flex-1">
      <aside className="flex w-64 flex-col border-r border-stone-200 bg-white">
        <div className="border-b border-stone-200 px-6 py-5">
          <p className="text-sm font-semibold text-stone-900">Back-office</p>
          <p className="mt-1 truncate text-xs text-stone-500">{session.user.email}</p>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm text-stone-700 hover:bg-stone-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/admin/login" });
          }}
          className="border-t border-stone-200 p-3"
        >
          <button
            type="submit"
            className="w-full rounded-md px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-100"
          >
            Se déconnecter
          </button>
        </form>
      </aside>
      <main className="flex-1 overflow-y-auto bg-stone-50 px-8 py-8">{children}</main>
    </div>
  );
}
