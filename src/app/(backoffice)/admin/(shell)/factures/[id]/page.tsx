import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatEuros } from "@/lib/formatMoney";
import { STATUT_PAIEMENT_LABELS, STATUT_PAIEMENT_COLORS } from "@/lib/reservationStatusLabels";
import { LignesReadOnlyTable } from "@/components/admin/LignesEditor";
import { calculerSolde } from "@/lib/facturation/solde";
import FactureActions from "./FactureActions";
import FactureEditForm from "./facture-edit-form";

export default async function FactureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const facture = await prisma.facture.findUnique({
    where: { id },
    include: {
      client: true,
      devis: {
        include: { client: true, reservation: { include: { creneau: { include: { visite: true } } } } },
      },
      lignes: { orderBy: { ordre: "asc" } },
    },
  });

  if (!facture) {
    notFound();
  }

  const estRattachee = !!facture.devis.reservationId;
  const solde = calculerSolde(facture, facture.devis);

  const produits = estRattachee
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
        <h1 className="text-xl font-semibold text-stone-900">Facture {facture.numero}</h1>
      </div>

      <FactureActions
        factureId={facture.id}
        email={
          (facture.devis.client ?? facture.client)?.email ?? facture.devis.reservation?.email ?? null
        }
        envoyeeLe={facture.envoyeeLe ? facture.envoyeeLe.toISOString() : null}
      />

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
          <p className="text-stone-500">Acompte</p>
          <p className="font-medium text-stone-900">
            {solde.acompteRegle > 0
              ? `${formatEuros(solde.acompteRegle)} déjà réglé`
              : solde.acomptePrevu > 0
                ? `${formatEuros(solde.acomptePrevu)} prévu, non réglé`
                : "Aucun"}
          </p>
        </div>
        <div>
          <p className="text-stone-500">Reste à payer</p>
          <p className="font-semibold text-stone-900">{formatEuros(solde.resteAPayer)}</p>
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

      {estRattachee ? (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-stone-900">Lignes</h2>
          <LignesReadOnlyTable
            lignes={facture.lignes.map((l) => ({
              id: l.id,
              denomination: l.denomination,
              quantite: l.quantite,
              prixUnitaire: l.prixUnitaire.toString(),
              montantLigne: l.montantLigne.toString(),
            }))}
          />
        </div>
      ) : null}

      <FactureEditForm
        factureId={facture.id}
        nbAdultesReel={facture.nbAdultesReel}
        nbEnfantsReel={facture.nbEnfantsReel}
        soldeStatutPaiement={facture.soldeStatutPaiement}
        noteLitige={facture.noteLitige ?? ""}
        notes={facture.notes ?? ""}
        estRattachee={estRattachee}
        produits={produitOptions}
        lignesInitiales={facture.lignes.map((l) => ({
          produitId: l.produitId,
          denomination: l.denomination,
          quantite: String(l.quantite),
          prixUnitaire: l.prixUnitaire.toString(),
        }))}
      />
    </div>
  );
}
