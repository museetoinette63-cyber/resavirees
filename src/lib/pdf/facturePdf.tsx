/**
 * Génération PDF de la facture — cahier des charges §6. Voir `devisPdf.tsx`
 * et `pdfShared.tsx` pour le contexte général (mise en page partagée,
 * TVA à 0%). Seule la section "totaux" diffère : une facture affiche le
 * solde (statut RECU/EN_ATTENTE/EXPIRE) au lieu de l'acompte, plus les
 * mentions d'ajustement et de litige propres à ce document.
 */

import { Document, Page, View, Text, renderToBuffer } from "@react-pdf/renderer";
import type { Prisma, SiteSettings } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  sharedStyles,
  formatEuros,
  formatDateParis,
  statutPaiementLabel,
  ExpediteurBlock,
  DestinataireBlock,
  PrestationSection,
  LignesTable,
  NotesSection,
  CgvSection,
} from "./pdfShared";

export type FactureWithRelations = Prisma.FactureGetPayload<{
  include: {
    devis: {
      include: { reservation: { include: { creneau: { include: { visite: true } } } }; client: true };
    };
    client: true;
    lignes: true;
  };
}>;

function FactureDocument({
  facture,
  siteSettings,
}: {
  facture: FactureWithRelations;
  siteSettings: SiteSettings | null;
}) {
  const reservation = facture.devis.reservation;
  // Destinataire : compte client (côté devis en priorité, sinon rattaché
  // directement à la facture) avec repli sur les coordonnées de la
  // réservation liée, même logique que pour le devis.
  const client = facture.devis.client ?? facture.client;
  const nom = client?.nomOuRaisonSociale ?? reservation?.nomOuRaisonSociale ?? "-";
  const adresse = client?.adressePostale ?? reservation?.adressePostale ?? null;
  const email = client?.email ?? reservation?.email ?? null;
  const telephone = client?.telephone ?? reservation?.telephone ?? null;

  // La Facture n'a pas ses propres date/heure/durée de prestation : elle a
  // toujours un devis lié (`devisId` requis), on les lit donc à travers lui.
  const datePrestation = facture.devis.dateEvenement ?? reservation?.creneau.dateHeure ?? null;
  const dureeMinutes = facture.devis.dureeMinutes ?? null;

  const lignesTriees = [...facture.lignes].sort((a, b) => a.ordre - b.ordre);

  const dateEmission = facture.envoyeeLe ?? facture.createdAt;

  return (
    <Document title={`Facture ${facture.numero}`}>
      <Page size="A4" style={sharedStyles.page}>
        <View style={sharedStyles.headerRow}>
          <View>
            <Text style={sharedStyles.docTitle}>FACTURE</Text>
            <Text style={sharedStyles.docNumero}>{facture.numero}</Text>
          </View>
          <View>
            <Text style={sharedStyles.docDate}>{`Date d'émission : ${formatDateParis(dateEmission)}`}</Text>
          </View>
        </View>

        <View style={sharedStyles.partiesRow}>
          <ExpediteurBlock
            info={{
              raisonSociale: siteSettings?.raisonSociale ?? null,
              siteName: siteSettings?.siteName ?? null,
              adresseSiege: siteSettings?.adresseSiege ?? null,
              siret: siteSettings?.siret ?? null,
              emailContact: siteSettings?.emailContact ?? null,
              telephoneContact: siteSettings?.telephoneContact ?? null,
            }}
          />
          <DestinataireBlock info={{ nom, adresse, email, telephone }} />
        </View>

        <PrestationSection info={{ date: datePrestation, dureeMinutes }} />

        <LignesTable lignes={lignesTriees} />

        <View style={sharedStyles.totalsBox}>
          <View style={sharedStyles.totalsRow}>
            <Text style={sharedStyles.totalsLabel}>TVA</Text>
            <Text style={sharedStyles.totalsValue}>0 % (association non assujettie)</Text>
          </View>
          <View style={sharedStyles.grandTotalRow}>
            <Text style={sharedStyles.grandTotalLabel}>Montant total</Text>
            <Text style={sharedStyles.grandTotalValue}>{formatEuros(facture.montantFinal)}</Text>
          </View>
          <View style={sharedStyles.totalsRow}>
            <Text style={sharedStyles.totalsLabel}>Montant du solde restant dû</Text>
            <Text style={sharedStyles.totalsValue}>{formatEuros(facture.montantFinal)}</Text>
          </View>
          <View style={sharedStyles.totalsRow}>
            <Text style={sharedStyles.totalsLabel}>Statut du solde</Text>
            <Text style={sharedStyles.totalsValue}>
              {statutPaiementLabel(facture.soldeStatutPaiement, null, facture.soldeDateReglement)}
            </Text>
          </View>
        </View>

        {facture.ajuste ? (
          <Text style={sharedStyles.ajusteNote}>
            {`Facture ajustée le ${formatDateParis(facture.ajusteLe)}${
              facture.ajustePar ? ` par ${facture.ajustePar}` : ""
            }`}
          </Text>
        ) : null}

        {facture.noteLitige ? (
          <View style={sharedStyles.litigeBox}>
            <Text style={sharedStyles.litigeTitle}>Litige signalé :</Text>
            <Text style={sharedStyles.litigeText}>{facture.noteLitige}</Text>
          </View>
        ) : null}

        <NotesSection notes={facture.notes} />

        <CgvSection cgvTexte={siteSettings?.cgvTexte} />

        <Text style={sharedStyles.footerNote}>
          TVA non applicable, art. 293 B du CGI — association non assujettie à la TVA.
        </Text>
      </Page>
    </Document>
  );
}

/** Rend le PDF de la facture dans un Buffer, prêt à être écrit sur disque ou attaché à un e-mail. */
export async function renderFacturePdf(facture: FactureWithRelations): Promise<Buffer> {
  const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  return renderToBuffer(<FactureDocument facture={facture} siteSettings={siteSettings} />);
}
