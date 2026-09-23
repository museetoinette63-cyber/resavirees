import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatEuros } from "@/lib/formatMoney";
import { STATUT_PAIEMENT_LABELS, STATUT_PAIEMENT_COLORS } from "@/lib/reservationStatusLabels";
import FactureEditForm from "./facture-edit-form";

export default async function FactureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const facture = await prisma.facture.findUnique({
    where: { id },
    include: {
      client: true,
      devis: { include: { reservation: { include: { creneau: { include: { visite: true } } } } } },
    },
  });

  if (!facture) {
    notFound();
  }

  const estRattachee = !!facture.devis.reservationId;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-stone-900">Facture {facture.numero}</h1>
        {facture.pdfUrl ? (
          <a
            href={facture.pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-stone-600 hover:text-stone-900"
          >
            Télécharger le PDF
          </a>
        ) : null}
      </div>

      {estRattachee && facture.devis.reservation ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          Cette facture découle d&apos;une réservation ({facture.devis.reservation.creneau.visite.nom} —{" "}
          {facture.devis.reservation.nomOuRaisonSociale}). Montant et pointage du solde se gèrent depuis la
          fiche réservation.{" "}
          <Link
            href={`/admin/reservations/${facture.devis.reservationId}`}
            className="font-medium underline"
          >
            Voir la réservation →
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 rounded-lg border border-stone-200 bg-white p-5 text-sm">
        <div>
          <p className="text-stone-500">Client</p>
          <p className="font-medium text-stone-900">
            {facture.client?.nomOuRaisonSociale ??
              facture.devis.reservation?.nomOuRaisonSociale ??
              "—"}
          </p>
        </div>
        <div>
          <p className="text-stone-500">Statut solde</p>
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_PAIEMENT_COLORS[facture.soldeStatutPaiement]}`}
          >
            {STATUT_PAIEMENT_LABELS[facture.soldeStatutPaiement]}
          </span>
        </div>
        <div>
          <p className="text-stone-500">Adultes / Enfants (réel)</p>
          <p className="font-medium text-stone-900">
            {facture.nbAdultesReel} / {facture.nbEnfantsReel}
          </p>
        </div>
        <div>
          <p className="text-stone-500">Montant final</p>
          <p className="font-medium text-stone-900">{formatEuros(facture.montantFinal)}</p>
        </div>
        <div>
          <p className="text-stone-500">TVA</p>
          <p className="font-medium text-stone-900">{facture.tauxTVA.toString()} %</p>
        </div>
        <div>
          <p className="text-stone-500">Devis lié</p>
          <Link href={`/admin/devis/${facture.devisId}`} className="font-medium text-stone-700 underline">
            {facture.devis.numero}
          </Link>
        </div>
      </div>

      <FactureEditForm
        factureId={facture.id}
        nbAdultesReel={facture.nbAdultesReel}
        nbEnfantsReel={facture.nbEnfantsReel}
        montantFinal={facture.montantFinal.toString()}
        soldeStatutPaiement={facture.soldeStatutPaiement}
        noteLitige={facture.noteLitige ?? ""}
        estRattachee={estRattachee}
      />
    </div>
  );
}
