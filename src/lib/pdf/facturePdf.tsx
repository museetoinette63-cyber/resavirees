/**
 * Génération PDF de la facture — cahier des charges §6. Voir `devisPdf.tsx`
 * pour le contexte général (mise en page déclarative, TVA à 0%).
 */

import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { Prisma } from "@prisma/client";

export type FactureWithRelations = Prisma.FactureGetPayload<{
  include: {
    devis: { include: { reservation: true; client: true } };
    client: true;
  };
}>;

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  numero: { fontSize: 11, marginTop: 4 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  label: { color: "#444" },
  value: { fontFamily: "Helvetica-Bold" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  totalLabel: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  totalValue: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  litigeBox: {
    marginTop: 16,
    padding: 8,
    border: "1px solid #c0392b",
    backgroundColor: "#fdf0ef",
  },
  litigeTitle: { fontFamily: "Helvetica-Bold", color: "#c0392b", marginBottom: 4 },
  footerNote: { marginTop: 24, fontSize: 8, color: "#666" },
});

function formatEuros(value: Prisma.Decimal | number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  const num = typeof value === "number" ? value : value.toNumber();
  return num.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "-";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function FactureDocument({ facture }: { facture: FactureWithRelations }) {
  const reservation = facture.devis.reservation;
  const client = facture.devis.client ?? facture.client;
  const nom = reservation?.nomOuRaisonSociale ?? client?.nomOuRaisonSociale ?? "-";
  const adresse = reservation?.adressePostale ?? client?.adressePostale ?? "-";
  const email = reservation?.email ?? client?.email ?? "-";
  const telephone = reservation?.telephone ?? client?.telephone ?? "-";
  const totalPersonnes = facture.nbAdultesReel + facture.nbEnfantsReel;

  return (
    <Document title={`Facture ${facture.numero}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Facture</Text>
            <Text style={styles.numero}>{facture.numero}</Text>
          </View>
          <View>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{formatDate(facture.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client</Text>
          <Text>{nom}</Text>
          <Text>{adresse}</Text>
          <Text>{email}</Text>
          <Text>{telephone}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Détail</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nombre de personnes (réel)</Text>
            <Text style={styles.value}>
              {totalPersonnes} ({facture.nbAdultesReel} adulte(s), {facture.nbEnfantsReel} enfant(s))
            </Text>
          </View>
          {facture.ajuste && (
            <View style={styles.row}>
              <Text style={styles.label}>Facture ajustée le</Text>
              <Text style={styles.value}>{formatDate(facture.ajusteLe)}</Text>
            </View>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Montant final</Text>
            <Text style={styles.totalValue}>{formatEuros(facture.montantFinal)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Taux de TVA</Text>
            <Text style={styles.value}>{facture.tauxTVA.toString()}% (association non assujettie)</Text>
          </View>
        </View>

        {facture.noteLitige && (
          <View style={styles.litigeBox}>
            <Text style={styles.litigeTitle}>Note de litige</Text>
            <Text>{facture.noteLitige}</Text>
          </View>
        )}

        <Text style={styles.footerNote}>
          TVA non applicable, art. 293 B du CGI — association non assujettie à la TVA.
        </Text>
      </Page>
    </Document>
  );
}

/** Rend le PDF de la facture dans un Buffer, prêt à être écrit sur disque ou attaché à un e-mail. */
export async function renderFacturePdf(facture: FactureWithRelations): Promise<Buffer> {
  return renderToBuffer(<FactureDocument facture={facture} />);
}
