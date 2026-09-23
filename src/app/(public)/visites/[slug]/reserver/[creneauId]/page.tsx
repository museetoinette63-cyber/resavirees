import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDateTimeParis } from "@/lib/formatDate";
import { toCents } from "@/lib/pricing/money";
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

  const visite = await prisma.visite.findUnique({
    where: { slug },
    include: { reglesForfait: true },
  });
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

  const forfait1 = visite.reglesForfait.find((r) => r.niveau === "NIVEAU_1");
  const forfait2 = visite.reglesForfait.find((r) => r.niveau === "NIVEAU_2");

  const pricingConfig = {
    tarifAdulte: toCents(visite.tarifAdulte),
    tarifEnfant: toCents(visite.tarifEnfant),
    forfait1:
      forfait1 && forfait1.seuilAdultes != null && forfait1.seuilEnfants != null
        ? {
            seuilAdultes: forfait1.seuilAdultes,
            seuilEnfants: forfait1.seuilEnfants,
            montant: toCents(forfait1.montant),
            actif: forfait1.actif,
          }
        : null,
    forfait2:
      forfait2 && forfait2.seuilGlobal != null
        ? {
            seuilGlobal: forfait2.seuilGlobal,
            montant: toCents(forfait2.montant),
            actif: forfait2.actif,
          }
        : null,
    majorationTardiveMontant: toCents(visite.majorationTardiveMontant),
    majorationTardiveDelaiHeures: visite.majorationTardiveDelaiHeures,
    dateEvenement: creneau.dateHeure.toISOString(),
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link href={`/visites/${slug}`} className="text-sm text-ink-soft hover:text-rust">
          ← Retour à la visite
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-rust-dark">
          Réserver : {visite.nom}
        </h1>
        <p className="mt-1 text-ink-soft">{formatDateTimeParis(creneau.dateHeure)}</p>
      </div>

      <ReservationForm creneauId={creneau.id} pricingConfig={pricingConfig} />
    </div>
  );
}
