/**
 * Génération PDF du devis — cahier des charges §6. Mise en page déclarative
 * avec `@react-pdf/renderer` (choix documenté dans le plan d'architecture :
 * plus simple à maintenir que pdf-lib pour un nombre variable de lignes).
 *
 * Important : l'association cliente n'est pas assujettie à la TVA — le taux
 * est donc toujours affiché à 0% (`devis.tauxTVA`, qui vaut 0 par défaut en
 * base, cf. schema.prisma).
 */

import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { Prisma } from "@prisma/client";

export type DevisWithRelations = Prisma.DevisGetPayload<{
  include: { reservation: true; client: true };
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
  table: { borderTop: "1px solid #ccc", borderBottom: "1px solid #ccc", paddingVertical: 6, marginBottom: 8 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  totalLabel: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  totalValue: { fontSize: 12, fontFamily: "Helvetica-Bold" },
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

function forfaitLabel(niveau: DevisWithRelations["forfaitApplique"]): string {
  if (niveau === "NIVEAU_1") return "Forfait niveau 1";
  if (niveau === "NIVEAU_2") return "Forfait niveau 2";
  return "Aucun";
}

function DevisDocument({ devis }: { devis: DevisWithRelations }) {
  const nom = devis.reservation?.nomOuRaisonSociale ?? devis.client?.nomOuRaisonSociale ?? "-";
  const adresse = devis.reservation?.adressePostale ?? devis.client?.adressePostale ?? "-";
  const email = devis.reservation?.email ?? devis.client?.email ?? "-";
  const telephone = devis.reservation?.telephone ?? devis.client?.telephone ?? "-";

  return (
    <Document title={`Devis ${devis.numero}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Devis</Text>
            <Text style={styles.numero}>{devis.numero}</Text>
          </View>
          <View>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{formatDate(devis.createdAt)}</Text>
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
          <Text style={styles.sectionTitle}>Détail du calcul</Text>
          <View style={styles.table}>
            <View style={styles.row}>
              <Text style={styles.label}>Adultes</Text>
              <Text style={styles.value}>
                {devis.nbAdultes} x {formatEuros(devis.tarifAdulteApplique)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Enfants</Text>
              <Text style={styles.value}>
                {devis.nbEnfants} x {formatEuros(devis.tarifEnfantApplique)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Coût individuel total</Text>
              <Text style={styles.value}>{formatEuros(devis.coutIndividuelTotal)}</Text>
            </View>
            {devis.forfaitApplique && (
              <View style={styles.row}>
                <Text style={styles.label}>{forfaitLabel(devis.forfaitApplique)}</Text>
                <Text style={styles.value}>{formatEuros(devis.montantForfait)}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>Montant avant majoration</Text>
              <Text style={styles.value}>{formatEuros(devis.montantAvantMajoration)}</Text>
            </View>
            {devis.majorationTardiveAppliquee && (
              <View style={styles.row}>
                <Text style={styles.label}>Majoration tardive</Text>
                <Text style={styles.value}>{formatEuros(devis.montantMajoration)}</Text>
              </View>
            )}
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Montant total</Text>
            <Text style={styles.totalValue}>{formatEuros(devis.montantTotal)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Taux de TVA</Text>
            <Text style={styles.value}>{devis.tauxTVA.toString()}% (association non assujettie)</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acompte</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Pourcentage</Text>
            <Text style={styles.value}>{devis.acomptePourcentage.toString()}%</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Montant</Text>
            <Text style={styles.value}>{formatEuros(devis.acompteMontant)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date limite de règlement</Text>
            <Text style={styles.value}>{formatDate(devis.acompteDateLimite)}</Text>
          </View>
        </View>

        <Text style={styles.footerNote}>
          TVA non applicable, art. 293 B du CGI — association non assujettie à la TVA.
        </Text>
      </Page>
    </Document>
  );
}

/** Rend le PDF du devis dans un Buffer, prêt à être écrit sur disque ou attaché à un e-mail. */
export async function renderDevisPdf(devis: DevisWithRelations): Promise<Buffer> {
  return renderToBuffer(<DevisDocument devis={devis} />);
}
