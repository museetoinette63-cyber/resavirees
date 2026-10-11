import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatEuros } from "@/lib/formatMoney";
import { STATUT_PAIEMENT_LABELS, STATUT_PAIEMENT_COLORS } from "@/lib/reservationStatusLabels";
import DevisEditForm from "./devis-edit-form";

export default async function DevisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [devis, produits, clients] = await Promise.all([
    prisma.devis.findUnique({
      where: { id },
      include: {
        client: true,
        reservation: { include: { creneau: { include: { visite: true } } } },
        facture: true,
        lignes: { orderBy: { ordre: "asc" } },
      },
    }),
    prisma.produit.findMany({
      where: { actif: true },
      orderBy: { nom: "asc" },
      select: { id: true, nom: true, prixUnitaire: true, dureeMinutes: true },
    }),
    prisma.client.findMany({
      orderBy: { nomOuRaisonSociale: "asc" },
      select: { id: true, nomOuRaisonSociale: true, email: true, telephone: true, adressePostale: true },
    }),
  ]);

  if (!devis) {
    notFound();
  }

  const estRattache = !!devis.reservationId;

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
        <a
          href={`/api/admin/devis/${devis.id}/pdf`}
          className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
        >
          Télécharger le PDF
        </a>
      </div>

      {estRattache && devis.reservation ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          Ce devis découle d&apos;une réservation ({devis.reservation.creneau.visite.nom} —{" "}
          {devis.reservation.nomOuRaisonSociale}). Vous pouvez modifier tout son contenu ci-dessous ; cela ne
          change pas le statut de la réservation, qui se gère depuis sa fiche.{" "}
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
          <p className="text-stone-500">Acompte</p>
          <p className="font-medium text-stone-900">
            {formatEuros(devis.acompteMontant)} ({devis.acomptePourcentage.toString()} %)
          </p>
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

      <DevisEditForm
        devisId={devis.id}
        clients={clients}
        clientId={devis.clientId}
        destinataire={{
          nom: devis.client?.nomOuRaisonSociale ?? devis.reservation?.nomOuRaisonSociale ?? "",
          email: devis.client?.email ?? devis.reservation?.email ?? "",
          telephone: devis.client?.telephone ?? devis.reservation?.telephone ?? "",
          adresse: devis.client?.adressePostale ?? devis.reservation?.adressePostale ?? "",
        }}
        reservationLiee={estRattache}
        nbAdultes={devis.nbAdultes}
        nbEnfants={devis.nbEnfants}
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
        acomptePourcentage={Number(devis.acomptePourcentage)}
        acompteMontant={Number(devis.acompteMontant)}
        acompteDelaiJours={devis.acompteDelaiJours}
        acompteDateLimite={devis.acompteDateLimite ? devis.acompteDateLimite.toISOString() : null}
        acompteStatutPaiement={devis.acompteStatutPaiement}
        acompteDateReglement={devis.acompteDateReglement ? devis.acompteDateReglement.toISOString() : null}
        acompteReferenceReglement={devis.acompteReferenceReglement ?? ""}
        hasFacture={!!devis.facture}
      />
    </div>
  );
}
