"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import LignesEditor, {
  nouvelleLigneVide,
  type LigneItem,
  type ProduitOption,
} from "@/components/admin/LignesEditor";
import { isoToDateInput, isoToTimeInput, toIsoOrNull } from "@/lib/formDates";

export interface ClientOption {
  id: string;
  nomOuRaisonSociale: string;
  email: string;
  telephone: string | null;
  adressePostale: string | null;
}

export interface DestinataireValeurs {
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
}

type StatutPaiement = "EN_ATTENTE" | "RECU" | "EXPIRE";

interface DevisEditFormProps {
  devisId: string;
  clients: ClientOption[];
  clientId: string | null;
  destinataire: DestinataireValeurs;
  reservationLiee: boolean;
  nbAdultes: number;
  nbEnfants: number;
  produits: ProduitOption[];
  lignesInitiales: LigneItem[];
  dateEvenement: string | null;
  dureeMinutes: number | null;
  notes: string;
  acomptePourcentage: number;
  acompteMontant: number;
  acompteDelaiJours: number;
  acompteDateLimite: string | null;
  acompteStatutPaiement: StatutPaiement;
  acompteDateReglement: string | null;
  acompteReferenceReglement: string;
  hasFacture: boolean;
}

const arrondi = (n: number) => Math.round(n * 100) / 100;

const inputClass =
  "w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none";
const labelClass = "text-sm font-medium text-stone-700";

export default function DevisEditForm(props: DevisEditFormProps) {
  const router = useRouter();
  const [clientId, setClientId] = useState(props.clientId ?? "");
  const [destNom, setDestNom] = useState(props.destinataire.nom);
  const [destEmail, setDestEmail] = useState(props.destinataire.email);
  const [destTelephone, setDestTelephone] = useState(props.destinataire.telephone);
  const [destAdresse, setDestAdresse] = useState(props.destinataire.adresse);
  // Les champs « destinataire » ne sont envoyés que s'ils ont été modifiés à la main.
  const [destModifie, setDestModifie] = useState(false);
  const [nbAdultes, setNbAdultes] = useState(String(props.nbAdultes));
  const [nbEnfants, setNbEnfants] = useState(String(props.nbEnfants));
  const [lignes, setLignes] = useState<LigneItem[]>(
    props.lignesInitiales.length > 0 ? props.lignesInitiales : [nouvelleLigneVide()]
  );
  const [date, setDate] = useState(isoToDateInput(props.dateEvenement));
  const [heure, setHeure] = useState(isoToTimeInput(props.dateEvenement));
  const [dureeMinutes, setDureeMinutes] = useState(
    props.dureeMinutes !== null ? String(props.dureeMinutes) : ""
  );
  const [notes, setNotes] = useState(props.notes);

  const [pourcentage, setPourcentage] = useState(String(props.acomptePourcentage));
  // null = montant déduit automatiquement du pourcentage et du total.
  const [montantSaisi, setMontantSaisi] = useState<string | null>(String(props.acompteMontant));
  const [delaiJours, setDelaiJours] = useState(String(props.acompteDelaiJours));
  const [dateLimite, setDateLimite] = useState(isoToDateInput(props.acompteDateLimite));
  const [statut, setStatut] = useState<StatutPaiement>(props.acompteStatutPaiement);
  const [dateReglement, setDateReglement] = useState(isoToDateInput(props.acompteDateReglement));
  const [reference, setReference] = useState(props.acompteReferenceReglement);

  const [message, setMessage] = useState<{ type: "ok" | "erreur"; texte: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const total = useMemo(
    () =>
      arrondi(
        lignes.reduce((sum, l) => sum + (Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0), 0)
      ),
    [lignes]
  );
  const montantAcompte =
    montantSaisi !== null ? montantSaisi : String(arrondi((total * (Number(pourcentage) || 0)) / 100));

  function changerClient(id: string) {
    setClientId(id);
    const choisi = props.clients.find((c) => c.id === id);
    if (choisi) {
      setDestNom(choisi.nomOuRaisonSociale);
      setDestEmail(choisi.email);
      setDestTelephone(choisi.telephone ?? "");
      setDestAdresse(choisi.adressePostale ?? "");
    }
    setDestModifie(false);
  }

  function changerDest(setter: (v: string) => void, valeur: string) {
    setter(valeur);
    setDestModifie(true);
  }

  function changerLignes(nouvelles: LigneItem[]) {
    setLignes(nouvelles);
    setMontantSaisi(null);
  }

  function changerPourcentage(valeur: string) {
    setPourcentage(valeur);
    setMontantSaisi(null);
  }

  function changerMontant(valeur: string) {
    setMontantSaisi(valeur);
    const nombre = Number(valeur);
    setPourcentage(total > 0 && Number.isFinite(nombre) ? String(arrondi((nombre / total) * 100)) : "0");
  }

  async function enregistrer() {
    setMessage(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/devis/${props.devisId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientId || null,
          destinataire: destModifie
            ? {
                nomOuRaisonSociale: destNom,
                email: destEmail,
                telephone: destTelephone || null,
                adressePostale: destAdresse || null,
              }
            : undefined,
          nbAdultes: Number(nbAdultes),
          nbEnfants: Number(nbEnfants),
          lignes: lignes.map((l) => ({
            produitId: l.produitId,
            denomination: l.denomination,
            quantite: Number(l.quantite),
            prixUnitaire: Number(l.prixUnitaire),
          })),
          dateEvenement: toIsoOrNull(date, heure),
          dureeMinutes: dureeMinutes ? Number(dureeMinutes) : null,
          notes: notes || null,
          acomptePourcentage: Number(pourcentage) || 0,
          acompteMontant: Number(montantAcompte) || 0,
          acompteDelaiJours: Number(delaiJours) || 0,
          acompteDateLimite: dateLimite ? toIsoOrNull(dateLimite) : null,
          acompteStatutPaiement: statut,
          acompteDateReglement: statut === "RECU" && dateReglement ? toIsoOrNull(dateReglement) : null,
          acompteReferenceReglement: statut === "RECU" ? reference || null : null,
        }),
      });
      if (!response.ok) {
        const b = (await response.json().catch(() => null)) as { error?: string } | null;
        setMessage({ type: "erreur", texte: b?.error ?? "Une erreur est survenue." });
        return;
      }
      setMessage({ type: "ok", texte: "Devis enregistré." });
      router.refresh();
    } catch {
      setMessage({ type: "erreur", texte: "Impossible de contacter le serveur." });
    } finally {
      setBusy(false);
    }
  }

  async function creerFacture() {
    setMessage(null);
    setBusy(true);
    try {
      const response = await fetch("/api/admin/factures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          devisId: props.devisId,
          lignes: lignes.map((l) => ({
            produitId: l.produitId,
            denomination: l.denomination,
            quantite: Number(l.quantite),
            prixUnitaire: Number(l.prixUnitaire),
          })),
        }),
      });
      if (!response.ok) {
        const b = (await response.json().catch(() => null)) as { error?: string } | null;
        setMessage({ type: "erreur", texte: b?.error ?? "Une erreur est survenue." });
        setBusy(false);
        return;
      }
      const b = (await response.json()) as { facture: { id: string } };
      router.push(`/admin/factures/${b.facture.id}`);
      router.refresh();
    } catch {
      setMessage({ type: "erreur", texte: "Impossible de contacter le serveur." });
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <form
        id="modifier"
        onSubmit={(e) => {
          e.preventDefault();
          void enregistrer();
        }}
        className="scroll-mt-4 space-y-5 rounded-lg border border-stone-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-stone-900">Modifier le devis</h2>

        <div className="space-y-1">
          <label htmlFor="clientId" className={labelClass}>
            Client
          </label>
          <select
            id="clientId"
            value={clientId}
            onChange={(e) => changerClient(e.target.value)}
            className={inputClass}
          >
            {props.reservationLiee ? <option value="">— Aucun (coordonnées de la réservation) —</option> : null}
            {props.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nomOuRaisonSociale} ({c.email})
              </option>
            ))}
          </select>
        </div>

        <fieldset className="space-y-4 rounded-md border border-stone-200 p-4">
          <legend className="px-1 text-sm font-semibold text-stone-900">Destinataire (nom et coordonnées)</legend>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="destNom" className={labelClass}>
                Nom ou raison sociale
              </label>
              <input
                id="destNom"
                value={destNom}
                onChange={(e) => changerDest(setDestNom, e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="destEmail" className={labelClass}>
                E-mail
              </label>
              <input
                id="destEmail"
                type="email"
                value={destEmail}
                onChange={(e) => changerDest(setDestEmail, e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="destTelephone" className={labelClass}>
                Téléphone
              </label>
              <input
                id="destTelephone"
                type="tel"
                value={destTelephone}
                onChange={(e) => changerDest(setDestTelephone, e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="destAdresse" className={labelClass}>
                Adresse postale
              </label>
              <textarea
                id="destAdresse"
                rows={2}
                value={destAdresse}
                onChange={(e) => changerDest(setDestAdresse, e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <p className="text-xs text-stone-500">
            Ces informations sont enregistrées sur la fiche du client (ou sur la réservation d&apos;origine) et
            s&apos;appliquent à tous ses documents.
          </p>
        </fieldset>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="nbAdultes" className={labelClass}>
              Adultes
            </label>
            <input
              id="nbAdultes"
              type="number"
              min={0}
              value={nbAdultes}
              onChange={(e) => setNbAdultes(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="nbEnfants" className={labelClass}>
              Enfants
            </label>
            <input
              id="nbEnfants"
              type="number"
              min={0}
              value={nbEnfants}
              onChange={(e) => setNbEnfants(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <label htmlFor="date" className={labelClass}>
              Date de la prestation
            </label>
            <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1">
            <label htmlFor="heure" className={labelClass}>
              Heure
            </label>
            <input id="heure" type="time" value={heure} onChange={(e) => setHeure(e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1">
            <label htmlFor="dureeMinutes" className={labelClass}>
              Durée (min)
            </label>
            <input
              id="dureeMinutes"
              type="number"
              min={0}
              value={dureeMinutes}
              onChange={(e) => setDureeMinutes(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-2">
          <span className={labelClass}>Lignes</span>
          <LignesEditor produits={props.produits} lignes={lignes} onChange={changerLignes} />
        </div>

        <fieldset className="space-y-4 rounded-md border border-stone-200 p-4">
          <legend className="px-1 text-sm font-semibold text-stone-900">Acompte</legend>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label htmlFor="pourcentage" className={labelClass}>
                Pourcentage (%)
              </label>
              <input
                id="pourcentage"
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={pourcentage}
                onChange={(e) => changerPourcentage(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="montantAcompte" className={labelClass}>
                Montant (€)
              </label>
              <input
                id="montantAcompte"
                type="number"
                min={0}
                step="0.01"
                value={montantAcompte}
                onChange={(e) => changerMontant(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="delaiJours" className={labelClass}>
                Délai de règlement (jours)
              </label>
              <input
                id="delaiJours"
                type="number"
                min={0}
                value={delaiJours}
                onChange={(e) => setDelaiJours(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label htmlFor="dateLimite" className={labelClass}>
                À régler avant le
              </label>
              <input
                id="dateLimite"
                type="date"
                value={dateLimite}
                onChange={(e) => setDateLimite(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="statut" className={labelClass}>
                Statut de l&apos;acompte
              </label>
              <select
                id="statut"
                value={statut}
                onChange={(e) => setStatut(e.target.value as StatutPaiement)}
                className={inputClass}
              >
                <option value="EN_ATTENTE">En attente</option>
                <option value="RECU">Réglé</option>
                <option value="EXPIRE">Délai dépassé</option>
              </select>
            </div>
            {statut === "RECU" ? (
              <div className="space-y-1">
                <label htmlFor="dateReglement" className={labelClass}>
                  Réglé le
                </label>
                <input
                  id="dateReglement"
                  type="date"
                  value={dateReglement}
                  onChange={(e) => setDateReglement(e.target.value)}
                  className={inputClass}
                />
              </div>
            ) : (
              <div />
            )}
          </div>
          {statut === "RECU" ? (
            <div className="space-y-1">
              <label htmlFor="reference" className={labelClass}>
                Référence de règlement
              </label>
              <input
                id="reference"
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="N° de virement, de chèque… (optionnel)"
                className={inputClass}
              />
            </div>
          ) : null}
        </fieldset>

        <div className="space-y-1">
          <label htmlFor="notes" className={labelClass}>
            Notes
          </label>
          <textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Note libre affichée sur le devis (optionnel)."
            className={inputClass}
          />
        </div>

        <p className="text-sm text-stone-600">
          Total : <strong>{total.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</strong>
        </p>

        {message ? (
          <p
            role={message.type === "erreur" ? "alert" : "status"}
            className={`rounded-md px-3 py-2 text-sm ${
              message.type === "ok"
                ? "border border-green-200 bg-green-50 text-green-700"
                : "border border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.type === "ok" ? "✓ " : ""}
            {message.texte}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Enregistrement…" : "Enregistrer le devis"}
        </button>
      </form>

      {!props.hasFacture ? (
        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <button
            type="button"
            disabled={busy}
            onClick={creerFacture}
            className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-60"
          >
            Créer la facture à partir de ce devis
          </button>
        </div>
      ) : null}
    </div>
  );
}
