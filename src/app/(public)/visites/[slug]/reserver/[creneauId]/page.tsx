import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDateTimeParis } from "@/lib/formatDate";
import ReservationForm from "@/components/public/ReservationForm";

// Must re-check the créneau's live status on every request — never
// statically prerendered (see (public)/page.tsx for full rationale).
export const dynamic = "force-dynamic";

export default async function ReserverPage({
  params,
}: {
  params: Promise<{ slug: string; creneauId: string }>;
}) {
  const { slug, creneauId } = await params;

  const visite = await prisma.visite.findUnique({ where: { slug } });
  if (!visite || !visite.visible) {
    notFound();
  }

  const creneau = await prisma.creneau.findUnique({ where: { id: creneauId } });

  // Le créneau doit appartenir à cette visite et être toujours PUBLIE : il a
  // pu être réservé par quelqu'un d'autre entre l'affichage du calendrier et
  // le clic sur ce créneau (condition de course).
  if (!creneau || creneau.visiteId !== visite.id || creneau.status !== "PUBLIE") {
    redirect(`/visites/${slug}?indisponible=1`);
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link href={`/visites/${slug}`} className="text-sm text-stone-500 hover:text-stone-800">
          ← Retour à la visite
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-stone-900">Réserver : {visite.nom}</h1>
        <p className="mt-1 text-stone-600">{formatDateTimeParis(creneau.dateHeure)}</p>
      </div>

      <ReservationForm creneauId={creneau.id} />
    </div>
  );
}
