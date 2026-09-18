import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { STATUTS_ANNULABLES } from "@/lib/reservationWorkflow/transitions";
import { RESERVATION_STATUS_LABELS, RESERVATION_STATUS_COLORS } from "@/lib/reservationStatusLabels";
import { formatEuros } from "@/lib/formatMoney";
import { cn } from "@/lib/cn";
import ReservationActions from "./reservation-actions";

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      creneau: { include: { visite: true } },
      client: true,
      devis: { include: { facture: true } },
      historique: { orderBy: { changedAt: "desc" } },
    },
  });

  if (!reservation) {
    notFound();
  }

  const { devis } = reservation;
  const facture = devis?.facture ?? null;
  const canCancel = STATUTS_ANNULABLES.includes(reservation.status);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-stone-400">Réservation</p>
          <h1 className="text-xl font-semibold text-stone-900">{reservation.nomOuRaisonSociale}</h1>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-sm font-medium",
            RESERVATION_STATUS_COLORS[reservation.status]
          )}
        >
          {RESERVATION_STATUS_LABELS[reservation.status]}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-stone-900">Coordonnées</h2>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Nom / raison sociale</dt>
              <dd className="text-right text-stone-900">{reservation.nomOuRaisonSociale}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Téléphone</dt>
              <dd className="text-right text-stone-900">{reservation.telephone}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">E-mail</dt>
              <dd className="text-right text-stone-900">{reservation.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Adresse</dt>
              <dd className="text-right text-stone-900">{reservation.adressePostale}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Participants</dt>
              <dd className="text-right text-stone-900">
                {reservation.nbAdultes} adulte(s), {reservation.nbEnfants} enfant(s)
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Date de la demande</dt>
              <dd className="text-right text-stone-900">
                {reservation.dateReservation.toLocaleString("fr-FR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </dd>
            </div>
            {reservation.client ? (
              <div className="flex justify-between gap-4">
                <dt className="text-stone-500">Compte client</dt>
                <dd className="text-right">
                  <Link href={`/admin/clients/${reservation.client.id}`} className="text-stone-900 underline">
                    {reservation.client.nomOuRaisonSociale}
                  </Link>
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="rounded-lg border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-stone-900">Visite &amp; créneau</h2>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Visite</dt>
              <dd className="text-right text-stone-900">{reservation.creneau.visite.nom}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Date / heure</dt>
              <dd className="text-right text-stone-900">
                {reservation.creneau.dateHeure.toLocaleString("fr-FR", {
                  dateStyle: "full",
                  timeStyle: "short",
                })}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Statut du créneau</dt>
              <dd className="text-right text-stone-900">{reservation.creneau.status}</dd>
            </div>
          </dl>
        </section>
      </div>

      {devis ? (
        <section className="rounded-lg border border-stone-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-900">Devis {devis.numero}</h2>
            {devis.pdfUrl ? (
              <a href={devis.pdfUrl} target="_blank" rel="noreferrer" className="text-sm text-stone-900 underline">
                Télécharger le PDF
              </a>
            ) : null}
          </div>
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Coût individuel total</dt>
              <dd className="text-stone-900">{formatEuros(devis.coutIndividuelTotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Forfait appliqué</dt>
              <dd className="text-stone-900">
                {devis.forfaitApplique
                  ? `${devis.forfaitApplique} (${formatEuros(devis.montantForfait ?? 0)})`
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Montant avant majoration</dt>
              <dd className="text-stone-900">{formatEuros(devis.montantAvantMajoration)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Majoration tardive</dt>
              <dd className="text-stone-900">
                {devis.majorationTardiveAppliquee
                  ? formatEuros(devis.montantMajoration)
                  : "Non appliquée"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Montant total</dt>
              <dd className="font-semibold text-stone-900">{formatEuros(devis.montantTotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">TVA</dt>
              <dd className="text-stone-900">{devis.tauxTVA.toString()} %</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Acompte ({devis.acomptePourcentage.toString()} %)</dt>
              <dd className="text-stone-900">{formatEuros(devis.acompteMontant)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Statut paiement acompte</dt>
              <dd className="text-stone-900">{devis.acompteStatutPaiement}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Date limite acompte</dt>
              <dd className="text-stone-900">
                {devis.acompteDateLimite ? devis.acompteDateLimite.toLocaleDateString("fr-FR") : "—"}
              </dd>
            </div>
            {devis.acompteDateReglement ? (
              <div className="flex justify-between gap-4">
                <dt className="text-stone-500">Réglé le</dt>
                <dd className="text-stone-900">
                  {devis.acompteDateReglement.toLocaleDateString("fr-FR")}
                  {devis.acompteReferenceReglement ? ` (${devis.acompteReferenceReglement})` : ""}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : (
        <p className="text-sm text-stone-400">Aucun devis lié pour le moment.</p>
      )}

      {facture ? (
        <section className="rounded-lg border border-stone-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-900">Facture {facture.numero}</h2>
            {facture.pdfUrl ? (
              <a href={facture.pdfUrl} target="_blank" rel="noreferrer" className="text-sm text-stone-900 underline">
                Télécharger le PDF
              </a>
            ) : null}
          </div>
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Participants (réel)</dt>
              <dd className="text-stone-900">
                {facture.nbAdultesReel} adulte(s), {facture.nbEnfantsReel} enfant(s)
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Montant final</dt>
              <dd className="font-semibold text-stone-900">{formatEuros(facture.montantFinal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Ajustée</dt>
              <dd className="text-stone-900">
                {facture.ajuste ? `Oui, par ${facture.ajustePar ?? "?"}` : "Non"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Statut paiement solde</dt>
              <dd className="text-stone-900">{facture.soldeStatutPaiement}</dd>
            </div>
            {facture.soldeDateReglement ? (
              <div className="flex justify-between gap-4">
                <dt className="text-stone-500">Solde réglé le</dt>
                <dd className="text-stone-900">
                  {facture.soldeDateReglement.toLocaleDateString("fr-FR")}
                  {facture.soldeReferenceReglement ? ` (${facture.soldeReferenceReglement})` : ""}
                </dd>
              </div>
            ) : null}
            {facture.noteLitige ? (
              <div className="col-span-full flex justify-between gap-4">
                <dt className="text-stone-500">Note de litige</dt>
                <dd className="text-right text-red-700">{facture.noteLitige}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      <section>
        <h2 className="text-sm font-semibold text-stone-900">Actions</h2>
        <div className="mt-3">
          <ReservationActions
            reservationId={reservation.id}
            status={reservation.status}
            devis={
              devis
                ? {
                    id: devis.id,
                    montantTotal: devis.montantTotal.toString(),
                    acompteMontant: devis.acompteMontant.toString(),
                    acompteDateLimite: devis.acompteDateLimite ? devis.acompteDateLimite.toISOString() : null,
                    acompteStatutPaiement: devis.acompteStatutPaiement,
                  }
                : null
            }
            facture={
              facture
                ? {
                    id: facture.id,
                    montantFinal: facture.montantFinal.toString(),
                    nbAdultesReel: facture.nbAdultesReel,
                    nbEnfantsReel: facture.nbEnfantsReel,
                    soldeStatutPaiement: facture.soldeStatutPaiement,
                    noteLitige: facture.noteLitige,
                  }
                : null
            }
            canCancel={canCancel}
          />
        </div>
      </section>

      {reservation.notesAdmin ? (
        <section className="rounded-lg border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-stone-900">Notes internes</h2>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-stone-700">
            {reservation.notesAdmin}
          </pre>
        </section>
      ) : null}

      <section className="rounded-lg border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-stone-900">Historique des statuts</h2>
        {reservation.historique.length === 0 ? (
          <p className="mt-2 text-sm text-stone-400">Aucun historique.</p>
        ) : (
          <ol className="mt-3 space-y-3">
            {reservation.historique.map((h) => (
              <li key={h.id} className="border-l-2 border-stone-200 pl-3 text-sm">
                <p className="text-stone-900">
                  {h.fromStatus ? RESERVATION_STATUS_LABELS[h.fromStatus] : "—"} →{" "}
                  <span className="font-medium">{RESERVATION_STATUS_LABELS[h.toStatus]}</span>
                </p>
                <p className="text-xs text-stone-500">
                  {h.changedAt.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })} —{" "}
                  {h.changedBy ?? "Système"}
                </p>
                {h.note ? <p className="mt-1 text-xs text-stone-600">{h.note}</p> : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
