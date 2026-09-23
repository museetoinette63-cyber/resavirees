/**
 * Génération PDF du devis — cahier des charges §6. Mise en page déclarative
 * avec `@react-pdf/renderer` (choix documenté dans le plan d'architecture :
 * plus simple à maintenir que pdf-lib pour un nombre variable de lignes).
 *
 * Document complet "facture-like" : expéditeur (association, depuis
 * SiteSettings) / destinataire (client), détail de la prestation (date,
 * heure, durée), tableau des lignes (DevisLigne), totaux + acompte, notes et
 * CGV. Voir `pdfShared.tsx` pour les blocs/styles partagés avec
 * `facturePdf.tsx` (seule la section "totaux" diffère entre les deux).
 *
 * Important : l'association cliente n'est pas assujettie à la TVA — le taux
 * est donc toujours affiché à 0% (`devis.tauxTVA`, qui vaut 0 par défaut en
 * base, cf. schema.prisma).
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

export type DevisWithRelations = Prisma.DevisGetPayload<{
  include: {
    reservation: { include: { creneau: { include: { visite: true } } } };
    client: true;
    lignes: true;
  };
}>;

function DevisDocument({
  devis,
  siteSettings,
}: {
  devis: DevisWithRelations;
  siteSettings: SiteSettings | null;
}) {
  // Destinataire : compte client s'il est lié, sinon coordonnées capturées
  // sur la réservation (un devis manuel peut n'avoir qu'un client, un devis
  // issu d'une réservation peut n'avoir que la réservation).
  const nom = devis.client?.nomOuRaisonSociale ?? devis.reservation?.nomOuRaisonSociale ?? "-";
  const adresse = devis.client?.adressePostale ?? devis.reservation?.adressePostale ?? null;
  const email = devis.client?.email ?? devis.reservation?.email ?? null;
  const telephone = devis.client?.telephone ?? devis.reservation?.telephone ?? null;

  // Date/heure/durée de la prestation : champs propres au devis s'ils sont
  // renseignés (devis manuel, ou copiés depuis le créneau à la création pour
  // un devis issu d'une réservation), sinon repli sur le créneau lié.
  const datePrestation = devis.dateEvenement ?? devis.reservation?.creneau.dateHeure ?? null;
  const dureeMinutes = devis.dureeMinutes ?? null;

  const lignesTriees = [...devis.lignes].sort((a, b) => a.ordre - b.ordre);

  // Date d'émission : date d'envoi si le devis a déjà été envoyé, sinon date de création.
  const dateEmission = devis.envoyeLe ?? devis.createdAt;

  return (
    <Document title={`Devis ${devis.numero}`}>
      <Page size="A4" style={sharedStyles.page}>
        <View style={sharedStyles.headerRow}>
          <View>
            <Text style={sharedStyles.docTitle}>DEVIS</Text>
            <Text style={sharedStyles.docNumero}>{devis.numero}</Text>
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
            <Text style={sharedStyles.grandTotalValue}>{formatEuros(devis.montantTotal)}</Text>
          </View>
          <View style={sharedStyles.totalsRow}>
            <Text style={sharedStyles.totalsLabel}>{`Acompte (${devis.acomptePourcentage.toString()} %)`}</Text>
            <Text style={sharedStyles.totalsValue}>{formatEuros(devis.acompteMontant)}</Text>
          </View>
          <View style={sharedStyles.totalsRow}>
            <Text style={sharedStyles.totalsLabel}>{"Statut de l'acompte"}</Text>
            <Text style={sharedStyles.totalsValue}>
              {statutPaiementLabel(
                devis.acompteStatutPaiement,
                devis.acompteDateLimite,
                devis.acompteDateReglement
              )}
            </Text>
          </View>
        </View>

        <NotesSection notes={devis.notes} />

        <CgvSection cgvTexte={siteSettings?.cgvTexte} />

        <Text style={sharedStyles.footerNote}>
          TVA non applicable, art. 293 B du CGI — association non assujettie à la TVA.
        </Text>
      </Page>
    </Document>
  );
}

/** Rend le PDF du devis dans un Buffer, prêt à être écrit sur disque ou attaché à un e-mail. */
export async function renderDevisPdf(devis: DevisWithRelations): Promise<Buffer> {
  const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  return renderToBuffer(<DevisDocument devis={devis} siteSettings={siteSettings} />);
}
