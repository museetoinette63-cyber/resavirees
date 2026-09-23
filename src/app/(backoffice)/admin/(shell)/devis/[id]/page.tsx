import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatEuros } from "@/lib/formatMoney";
import { STATUT_PAIEMENT_LABELS, STATUT_PAIEMENT_COLORS } from "@/lib/reservationStatusLabels";
import { LignesReadOnlyTable } from "@/components/admin/LignesEditor";
import DevisEditForm from "./devis-edit-form";

export default async function DevisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const devis = await prisma.devis.findUnique({
    where: { id },
    include: {
      client: true,
      reservation: { include: { creneau: { include: { visite: true } } } },
      facture: true,
      lignes: { orderBy: { ordre: "asc" } },
    },
  });

  if (!devis) {
    notFound();
  }

  const estRattache = !!devis.reservationId;

  const produits = estRattache
    ? []
    : await prisma.produit.findMany({
        where: { actif: true },
        orderBy: { nom: "asc" },
        select: { id: true, nom: true, prixUnitaire: true, dureeMinutes: true },
      });
  const produitOptions = produits.map((p) => ({
    id: p.id,
    nom: p.nom,
    prixUnitaire: p.prixUnitaire.toString(),
    dureeMinutes: p.dureeMinutes,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-stone-900">Devis {devis.numero}</h1>
        {devis.pdfUrl ? (
          <a
            href={devis.pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-stone-600 hover:text-stone-900"
          >
            Télécharger le PDF
          </a>
        ) : null}
      </div>

      {estRattache && devis.reservation ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          Ce devis est rattaché à une réservation ({devis.reservation.creneau.visite.nom} —{" "}
          {devis.reservation.nomOuRaisonSociale}). Les montants et le pointage de l&apos;acompte se
          gèrent depuis la fiche réservation pour rester cohérents avec le cycle de vie.{" "}
          <Link href={`/admin/reservations/${devis.reservationId}`} className="font-medium underline">
            Voir la réservation →
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 rounded-lg border border-stone-200 bg-white p-5 text-sm">
        <div>
          <p className="text-stone-500">Client</p>
          <p className="font-medium text-stone-900">
            {devis.client?.nomOuRaisonSociale ?? devis.reservation?.nomOuRaisonSociale ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-stone-500">Statut acompte</p>
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_PAIEMENT_COLORS[devis.acompteStatutPaiement]}`}
          >
            {STATUT_PAIEMENT_LABELS[devis.acompteStatutPaiement]}
          </span>
        </div>
        <div>
          <p className="text-stone-500">Adultes / Enfants</p>
          <p className="font-medium text-stone-900">
            {devis.nbAdultes} / {devis.nbEnfants}
          </p>
        </div>
        <div>
          <p className="text-stone-500">Montant total</p>
          <p className="font-medium text-stone-900">{formatEuros(devis.montantTotal)}</p>
        </div>
        <div>
          <p className="text-stone-500">TVA</p>
          <p className="font-medium text-stone-900">{devis.tauxTVA.toString()} %</p>
        </div>
        <div>
          <p className="text-stone-500">Facture liée</p>
          <p className="font-medium text-stone-900">
            {devis.facture ? (
              <Link href={`/admin/factures/${devis.facture.id}`} className="text-stone-700 underline">
                {devis.facture.numero}
              </Link>
            ) : (
              "—"
            )}
          </p>
        </div>
      </div>

      {estRattache ? (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-stone-900">Lignes</h2>
          <LignesReadOnlyTable
            lignes={devis.lignes.map((l) => ({
              id: l.id,
              denomination: l.denomination,
              quantite: l.quantite,
              prixUnitaire: l.prixUnitaire.toString(),
              montantLigne: l.montantLigne.toString(),
            }))}
          />
        </div>
      ) : null}

      {!estRattache ? (
        <DevisEditForm
          devisId={devis.id}
          nbAdultes={devis.nbAdultes}
          nbEnfants={devis.nbEnfants}
          acompteStatutPaiement={devis.acompteStatutPaiement}
          hasFacture={!!devis.facture}
          produits={produitOptions}
          lignesInitiales={devis.lignes.map((l) => ({
            produitId: l.produitId,
            denomination: l.denomination,
            quantite: String(l.quantite),
            prixUnitaire: l.prixUnitaire.toString(),
          }))}
          dateEvenement={devis.dateEvenement ? devis.dateEvenement.toISOString() : null}
          dureeMinutes={devis.dureeMinutes}
          notes={devis.notes ?? ""}
        />
      ) : null}
    </div>
  );
}
