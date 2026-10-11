import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatEuros } from "@/lib/formatMoney";
import { STATUT_PAIEMENT_LABELS, STATUT_PAIEMENT_COLORS } from "@/lib/reservationStatusLabels";
import { calculerSolde } from "@/lib/facturation/solde";
import FactureActions from "./FactureActions";
import FactureEditForm from "./facture-edit-form";

export default async function FactureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [facture, produits, clients] = await Promise.all([
    prisma.facture.findUnique({
      where: { id },
      include: {
        client: true,
        devis: {
          include: { client: true, reservation: { include: { creneau: { include: { visite: true } } } } },
        },
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

  if (!facture) {
    notFound();
  }

  const estRattachee = !!facture.devis.reservationId;
  const solde = calculerSolde(facture, facture.devis);

  // Destinataire effectif du document : fiche client de la facture, sinon
  // celle du devis, sinon coordonnées de la réservation d'origine.
  const sourceClient = facture.client ?? facture.devis.client;
  const reservation = facture.devis.reservation;
  const destinataire = {
    nom: sourceClient?.nomOuRaisonSociale ?? reservation?.nomOuRaisonSociale ?? "",
    email: sourceClient?.email ?? reservation?.email ?? "",
    telephone: sourceClient?.telephone ?? reservation?.telephone ?? "",
    adresse: sourceClient?.adressePostale ?? reservation?.adressePostale ?? "",
  };

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
        email={destinataire.email}
        envoyeeLe={facture.envoyeeLe ? facture.envoyeeLe.toISOString() : null}
      />

      {estRattachee && facture.devis.reservation ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          Cette facture découle d&apos;une réservation ({facture.devis.reservation.creneau.visite.nom} —{" "}
          {facture.devis.reservation.nomOuRaisonSociale}). Vous pouvez modifier tout son contenu ci-dessous ;
          cela ne change pas le statut de la réservation, qui se gère depuis sa fiche.{" "}
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
          <p className="font-medium text-stone-900">{destinataire.nom || "—"}</p>
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

      <FactureEditForm
        factureId={facture.id}
        clients={clients}
        clientId={facture.clientId}
        destinataire={destinataire}
        nbAdultesReel={facture.nbAdultesReel}
        nbEnfantsReel={facture.nbEnfantsReel}
        produits={produitOptions}
        lignesInitiales={facture.lignes.map((l) => ({
          produitId: l.produitId,
          denomination: l.denomination,
          quantite: String(l.quantite),
          prixUnitaire: l.prixUnitaire.toString(),
        }))}
        notes={facture.notes ?? ""}
        noteLitige={facture.noteLitige ?? ""}
        dateEvenement={facture.devis.dateEvenement ? facture.devis.dateEvenement.toISOString() : null}
        dureeMinutes={facture.devis.dureeMinutes}
        acompteMontant={Number(facture.devis.acompteMontant)}
        acompteStatutPaiement={facture.devis.acompteStatutPaiement}
        acompteDateReglement={
          facture.devis.acompteDateReglement ? facture.devis.acompteDateReglement.toISOString() : null
        }
        acompteReferenceReglement={facture.devis.acompteReferenceReglement ?? ""}
        soldeStatutPaiement={facture.soldeStatutPaiement}
        soldeDateReglement={facture.soldeDateReglement ? facture.soldeDateReglement.toISOString() : null}
        soldeReferenceReglement={facture.soldeReferenceReglement ?? ""}
      />
    </div>
  );
}
