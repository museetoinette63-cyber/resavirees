/**
 * Blocs et styles partagés entre `devisPdf.tsx` et `facturePdf.tsx` — les
 * deux documents partagent la même mise en page générale (en-tête,
 * expéditeur/destinataire, détail de la prestation, tableau de lignes, CGV),
 * seule la section "totaux" diffère (acompte pour un devis, solde pour une
 * facture) et reste donc définie dans chaque fichier.
 */

import { View, Text, StyleSheet } from "@react-pdf/renderer";
import type { Prisma, StatutPaiement } from "@prisma/client";

export const PARIS_TZ = "Europe/Paris";

/** Formate un montant (Decimal Prisma ou nombre) en euros, format français. */
export function formatEuros(value: Prisma.Decimal | number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  const num = typeof value === "number" ? value : value.toNumber();
  return num.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

/** Formate une date dans le fuseau Europe/Paris (jour long), ex. "14 mars 2026". */
export function formatDateParis(date: Date | null | undefined): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS_TZ,
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** Formate une heure dans le fuseau Europe/Paris, ex. "14h30". */
export function formatHeureParis(date: Date | null | undefined): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS_TZ,
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(date)
    .replace(":", "h");
}

/** Formate une durée en minutes en "Xh", "Xh YYmin" ou "X min". */
export function formatDuree(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "-";
  if (minutes < 60) return `${minutes} min`;
  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  return reste === 0 ? `${heures}h` : `${heures}h ${String(reste).padStart(2, "0")}min`;
}

/**
 * Libellé du statut de paiement (acompte d'un devis ou solde d'une facture),
 * même phrasé pour les deux : "À régler avant le X" / "Réglé le X" / "Délai
 * dépassé". `dateLimite` est optionnelle : `Facture` n'a pas de date limite
 * de solde en base (contrairement à `Devis.acompteDateLimite`) — dans ce cas
 * on retombe sur un libellé neutre pour EN_ATTENTE.
 */
export function statutPaiementLabel(
  statut: StatutPaiement,
  dateLimite: Date | null,
  dateReglement: Date | null
): string {
  if (statut === "RECU") return `Réglé le ${formatDateParis(dateReglement)}`;
  if (statut === "EXPIRE") return "Délai dépassé";
  return dateLimite ? `À régler avant le ${formatDateParis(dateLimite)}` : "En attente de règlement";
}

export const sharedStyles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },

  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 22 },
  docTitle: { fontSize: 20, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  docNumero: { fontSize: 11, marginTop: 4, color: "#444" },
  docDate: { fontSize: 9, color: "#666" },

  partiesRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  partieBox: { width: "47%" },
  partieLabel: {
    fontSize: 8,
    textTransform: "uppercase",
    color: "#999",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  partieNomBold: { fontFamily: "Helvetica-Bold", fontSize: 11, marginBottom: 3 },
  partieLine: { fontSize: 9, marginBottom: 2, color: "#333" },

  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    textTransform: "uppercase",
    color: "#666",
    letterSpacing: 0.5,
  },

  prestationRow: { flexDirection: "row", marginBottom: 3 },
  prestationLabel: { width: 90, color: "#555" },
  prestationValue: { fontFamily: "Helvetica-Bold" },

  table: { marginTop: 2 },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottom: "1px solid #333",
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #e5e5e5",
    paddingVertical: 5,
  },
  colDenomination: { flex: 3 },
  colQuantite: { flex: 0.8, textAlign: "right" },
  colPrixUnitaire: { flex: 1.2, textAlign: "right" },
  colMontant: { flex: 1.2, textAlign: "right" },
  tableHeaderText: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", color: "#555" },
  tableCellText: { fontSize: 9 },

  totalsBox: { marginTop: 14, alignSelf: "flex-end", width: 260 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  totalsLabel: { color: "#444" },
  totalsValue: { fontFamily: "Helvetica-Bold", textAlign: "right" },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 4,
    paddingTop: 6,
    paddingBottom: 6,
    borderTop: "1px solid #333",
    borderBottom: "1px solid #333",
  },
  grandTotalLabel: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  grandTotalValue: { fontSize: 12, fontFamily: "Helvetica-Bold" },

  noteBox: { marginTop: 16, padding: 8, backgroundColor: "#f7f5f2" },
  noteTitle: { fontFamily: "Helvetica-Bold", marginBottom: 3, fontSize: 9 },
  noteText: { fontSize: 9, color: "#333" },

  ajusteNote: { marginTop: 8, fontSize: 8, color: "#888" },

  litigeBox: { marginTop: 12, padding: 8, border: "1px solid #c0392b", backgroundColor: "#fdf0ef" },
  litigeTitle: { fontFamily: "Helvetica-Bold", color: "#c0392b", marginBottom: 4, fontSize: 9 },
  litigeText: { fontSize: 9, color: "#7a2a20" },

  cgvSection: { marginTop: 22, paddingTop: 10, borderTop: "1px solid #ccc" },
  cgvTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", marginBottom: 4, color: "#666" },
  cgvText: { fontSize: 7, color: "#777", lineHeight: 1.4 },

  footerNote: { marginTop: 10, fontSize: 8, color: "#666" },
});

export interface ExpediteurInfo {
  raisonSociale: string | null;
  siteName: string | null;
  adresseSiege: string | null;
  siret: string | null;
  emailContact: string | null;
  telephoneContact: string | null;
}

/** Bloc "expéditeur" (identité de l'association émettrice), depuis SiteSettings. */
export function ExpediteurBlock({ info }: { info: ExpediteurInfo }) {
  const nom = info.raisonSociale?.trim() || info.siteName?.trim() || "-";
  return (
    <View style={sharedStyles.partieBox}>
      <Text style={sharedStyles.partieLabel}>Expéditeur</Text>
      <Text style={sharedStyles.partieNomBold}>{nom}</Text>
      {info.adresseSiege
        ? info.adresseSiege
            .split("\n")
            .map((ligne, i) => (
              <Text key={i} style={sharedStyles.partieLine}>
                {ligne}
              </Text>
            ))
        : null}
      {info.siret ? <Text style={sharedStyles.partieLine}>{`SIRET : ${info.siret}`}</Text> : null}
      {info.emailContact ? <Text style={sharedStyles.partieLine}>{info.emailContact}</Text> : null}
      {info.telephoneContact ? <Text style={sharedStyles.partieLine}>{info.telephoneContact}</Text> : null}
    </View>
  );
}

export interface DestinataireInfo {
  nom: string;
  adresse: string | null;
  email: string | null;
  telephone: string | null;
}

/** Bloc "destinataire" (le client), avec repli client compte <-> réservation. */
export function DestinataireBlock({ info }: { info: DestinataireInfo }) {
  return (
    <View style={sharedStyles.partieBox}>
      <Text style={sharedStyles.partieLabel}>Destinataire</Text>
      <Text style={sharedStyles.partieNomBold}>{info.nom}</Text>
      {info.adresse
        ? info.adresse
            .split("\n")
            .map((ligne, i) => (
              <Text key={i} style={sharedStyles.partieLine}>
                {ligne}
              </Text>
            ))
        : null}
      {info.email ? <Text style={sharedStyles.partieLine}>{info.email}</Text> : null}
      {info.telephone ? <Text style={sharedStyles.partieLine}>{info.telephone}</Text> : null}
    </View>
  );
}

export interface PrestationInfo {
  date: Date | null;
  dureeMinutes: number | null;
}

/** Section "Détails de la prestation" : date, heure et durée (Europe/Paris). */
export function PrestationSection({ info }: { info: PrestationInfo }) {
  return (
    <View style={sharedStyles.section}>
      <Text style={sharedStyles.sectionTitle}>Détails de la prestation</Text>
      <View style={sharedStyles.prestationRow}>
        <Text style={sharedStyles.prestationLabel}>Date</Text>
        <Text style={sharedStyles.prestationValue}>{formatDateParis(info.date)}</Text>
      </View>
      <View style={sharedStyles.prestationRow}>
        <Text style={sharedStyles.prestationLabel}>Heure</Text>
        <Text style={sharedStyles.prestationValue}>{formatHeureParis(info.date)}</Text>
      </View>
      <View style={sharedStyles.prestationRow}>
        <Text style={sharedStyles.prestationLabel}>Durée</Text>
        <Text style={sharedStyles.prestationValue}>{formatDuree(info.dureeMinutes)}</Text>
      </View>
    </View>
  );
}

export interface LigneInfo {
  id: string;
  denomination: string;
  quantite: number;
  prixUnitaire: Prisma.Decimal;
  montantLigne: Prisma.Decimal;
}

/** Tableau des lignes (DevisLigne/FactureLigne), pas de composant table natif dans react-pdf. */
export function LignesTable({ lignes }: { lignes: LigneInfo[] }) {
  return (
    <View style={sharedStyles.section}>
      <Text style={sharedStyles.sectionTitle}>Détail</Text>
      <View style={sharedStyles.table}>
        <View style={sharedStyles.tableHeaderRow}>
          <Text style={[sharedStyles.colDenomination, sharedStyles.tableHeaderText]}>Dénomination</Text>
          <Text style={[sharedStyles.colQuantite, sharedStyles.tableHeaderText]}>Quantité</Text>
          <Text style={[sharedStyles.colPrixUnitaire, sharedStyles.tableHeaderText]}>Prix unitaire</Text>
          <Text style={[sharedStyles.colMontant, sharedStyles.tableHeaderText]}>Montant</Text>
        </View>
        {lignes.length === 0 ? (
          <View style={sharedStyles.tableRow}>
            <Text style={[sharedStyles.colDenomination, sharedStyles.tableCellText]}>Aucune ligne.</Text>
          </View>
        ) : (
          lignes.map((l) => (
            <View key={l.id} style={sharedStyles.tableRow}>
              <Text style={[sharedStyles.colDenomination, sharedStyles.tableCellText]}>
                {l.denomination}
              </Text>
              <Text style={[sharedStyles.colQuantite, sharedStyles.tableCellText]}>{l.quantite}</Text>
              <Text style={[sharedStyles.colPrixUnitaire, sharedStyles.tableCellText]}>
                {formatEuros(l.prixUnitaire)}
              </Text>
              <Text style={[sharedStyles.colMontant, sharedStyles.tableCellText]}>
                {formatEuros(l.montantLigne)}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

/** Section "Notes" (texte libre, si renseigné). */
export function NotesSection({ notes }: { notes: string | null }) {
  if (!notes) return null;
  return (
    <View style={sharedStyles.noteBox}>
      <Text style={sharedStyles.noteTitle}>Notes</Text>
      {notes.split("\n").map((ligne, i) => (
        <Text key={i} style={sharedStyles.noteText}>
          {ligne}
        </Text>
      ))}
    </View>
  );
}

/** Section CGV en bas de document, texte libre depuis SiteSettings.cgvTexte. */
export function CgvSection({ cgvTexte }: { cgvTexte: string | null | undefined }) {
  if (!cgvTexte) return null;
  return (
    <View style={sharedStyles.cgvSection}>
      <Text style={sharedStyles.cgvTitle}>Conditions générales de vente</Text>
      {cgvTexte.split("\n").map((ligne, i) => (
        <Text key={i} style={sharedStyles.cgvText}>
          {ligne}
        </Text>
      ))}
    </View>
  );
}
