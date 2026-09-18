import Link from "next/link";
import { prisma } from "@/lib/prisma";

// Minimal overview: a handful of counts plus links into the sections that
// matter most day-to-day. Not the focus of this build — reservations,
// clients and calendrier are owned by other engineers in parallel.
export default async function AdminDashboardPage() {
  const [visitesTotal, visitesVisibles, creneauxPublies, reservationsEnAttente] =
    await Promise.all([
      prisma.visite.count(),
      prisma.visite.count({ where: { visible: true } }),
      prisma.creneau.count({ where: { status: "PUBLIE", dateHeure: { gte: new Date() } } }),
      prisma.reservation.count({ where: { status: "EN_ATTENTE_VALIDATION_ADMIN" } }),
    ]);

  const cards = [
    {
      label: "Visites",
      value: `${visitesVisibles} / ${visitesTotal}`,
      hint: "visibles / au total",
      href: "/admin/visites",
    },
    {
      label: "Créneaux publiés à venir",
      value: String(creneauxPublies),
      hint: "sur le site public",
      href: "/admin/creneaux",
    },
    {
      label: "Réservations en attente",
      value: String(reservationsEnAttente),
      hint: "de validation admin",
      href: "/admin/reservations",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-stone-900">Tableau de bord</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm transition hover:border-stone-300"
          >
            <p className="text-sm font-medium text-stone-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-stone-900">{card.value}</p>
            <p className="mt-1 text-xs text-stone-400">{card.hint}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-stone-700">Accès rapide</p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link href="/admin/visites/nouveau" className="text-stone-600 underline hover:text-stone-900">
            Créer une visite
          </Link>
          <Link href="/admin/creneaux/nouveau-lot" className="text-stone-600 underline hover:text-stone-900">
            Créer des créneaux en lot
          </Link>
          <Link href="/admin/parametres" className="text-stone-600 underline hover:text-stone-900">
            Modifier les paramètres du site
          </Link>
        </div>
      </div>
    </div>
  );
}
