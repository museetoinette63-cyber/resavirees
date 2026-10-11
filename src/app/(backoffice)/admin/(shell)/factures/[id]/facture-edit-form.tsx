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

interface FactureEditFormProps {
  factureId: string;
  clients: ClientOption[];
  clientId: string | null;
  destinataire: DestinataireValeurs;
  nbAdultesReel: number;
  nbEnfantsReel: number;
  produits: ProduitOption[];
  lignesInitiales: LigneItem[];
  notes: string;
  noteLitige: string;
  dateEvenement: string | null;
  dureeMinutes: number | null;
  acompteMontant: number;
  acompteStatutPaiement: StatutPaiement;
  acompteDateReglement: string | null;
  acompteReferenceReglement: string;
  soldeStatutPaiement: StatutPaiement;
  soldeDateReglement: string | null;
  soldeReferenceReglement: string;
}

const arrondi = (n: number) => Math.round(n * 100) / 100;

const inputClass =
  "w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none";
const labelClass = "text-sm font-medium text-stone-700";

function SelectStatut({
  id,
  value,
  onChange,
}: {
  id: string;
  value: StatutPaiement;
  onChange: (v: StatutPaiement) => void;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as StatutPaiement)}
      className={inputClass}
    >
      <option value="EN_ATTENTE">En attente</option>
      <option value="RECU">Réglé</option>
      <option value="EXPIRE">Délai dépassé</option>
    </select>
  );
}

export default function FactureEditForm(props: FactureEditFormProps) {
  const router = useRouter();
  const [clientId, setClientId] = useState(props.clientId ?? "");
  const [destNom, setDestNom] = useState(props.destinataire.nom);
  const [destEmail, setDestEmail] = useState(props.destinataire.email);
  const [destTelephone, setDestTelephone] = useState(props.destinataire.telephone);
  const [destAdresse, setDestAdresse] = useState(props.destinataire.adresse);
  // Les champs « destinataire » ne sont envoyés que s'ils ont été modifiés à la main.
  const [destModifie, setDestModifie] = useState(false);
  const [nbAdultesReel, setNbAdultesReel] = useState(String(props.nbAdultesReel));
  const [nbEnfantsReel, setNbEnfantsReel] = useState(String(props.nbEnfantsReel));
  const [lignes, setLignes] = useState<LigneItem[]>(
    props.lignesInitiales.length > 0 ? props.lignesInitiales : [nouvelleLigneVide()]
  );
  const [notes, setNotes] = useState(props.notes);
  const [noteLitige, setNoteLitige] = useState(props.noteLitige);
  const [date, setDate] = useState(isoToDateInput(props.dateEvenement));
  const [heure, setHeure] = useState(isoToTimeInput(props.dateEvenement));
  const [dureeMinutes, setDureeMinutes] = useState(
    props.dureeMinutes !== null ? String(props.dureeMinutes) : ""
  );

  const [acompteMontant, setAcompteMontant] = useState(String(props.acompteMontant));
  const [acompteStatut, setAcompteStatut] = useState<StatutPaiement>(props.acompteStatutPaiement);
  const [acompteDate, setAcompteDate] = useState(isoToDateInput(props.acompteDateReglement));
  const [acompteReference, setAcompteReference] = useState(props.acompteReferenceReglement);

  const [soldeStatut, setSoldeStatut] = useState<StatutPaiement>(props.soldeStatutPaiement);
  const [soldeDate, setSoldeDate] = useState(isoToDateInput(props.soldeDateReglement));
  const [soldeReference, setSoldeReference] = useState(props.soldeReferenceReglement);

  const [message, setMessage] = useState<{ type: "ok" | "erreur"; texte: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const total = useMemo(
    () =>
      arrondi(
        lignes.reduce((sum, l) => sum + (Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0), 0)
      ),
    [lignes]
  );
  const acompteDeduit = acompteStatut === "RECU" ? Math.min(Number(acompteMontant) || 0, total) : 0;
  const resteAPayer = arrondi(total - acompteDeduit);

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

  async function enregistrer() {
    setMessage(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/factures/${props.factureId}`, {
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
          nbAdultesReel: Number(nbAdultesReel),
          nbEnfantsReel: Number(nbEnfantsReel),
          lignes: lignes.map((l) => ({
            produitId: l.produitId,
            denomination: l.denomination,
            quantite: Number(l.quantite),
            prixUnitaire: Number(l.prixUnitaire),
          })),
          notes: notes || null,
          noteLitige: noteLitige || null,
          dateEvenement: toIsoOrNull(date, heure),
          dureeMinutes: dureeMinutes ? Number(dureeMinutes) : null,
          acompteMontant: Number(acompteMontant) || 0,
          acompteStatutPaiement: acompteStatut,
          acompteDateReglement: acompteStatut === "RECU" && acompteDate ? toIsoOrNull(acompteDate) : null,
          acompteReferenceReglement: acompteStatut === "RECU" ? acompteReference || null : null,
          soldeStatutPaiement: soldeStatut,
          soldeDateReglement: soldeStatut === "RECU" && soldeDate ? toIsoOrNull(soldeDate) : null,
          soldeReferenceReglement: soldeStatut === "RECU" ? soldeReference || null : null,
        }),
      });
      if (!response.ok) {
        const b = (await response.json().catch(() => null)) as { error?: string } | null;
        setMessage({ type: "erreur", texte: b?.error ?? "Une erreur est survenue." });
        return;
      }
      setMessage({ type: "ok", texte: "Facture enregistrée." });
      router.refresh();
    } catch {
      setMessage({ type: "erreur", texte: "Impossible de contacter le serveur." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      id="modifier"
      onSubmit={(e) => {
        e.preventDefault();
        void enregistrer();
      }}
      className="scroll-mt-4 space-y-5 rounded-lg border border-stone-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-sm font-semibold text-stone-900">Modifier la facture</h2>

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
          <option value="">— Aucun (coordonnées de la réservation) —</option>
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
          <label htmlFor="nbAdultesReel" className={labelClass}>
            Adultes (réel)
          </label>
          <input
            id="nbAdultesReel"
            type="number"
            min={0}
            value={nbAdultesReel}
            onChange={(e) => setNbAdultesReel(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="nbEnfantsReel" className={labelClass}>
            Enfants (réel)
          </label>
          <input
            id="nbEnfantsReel"
            type="number"
            min={0}
            value={nbEnfantsReel}
            onChange={(e) => setNbEnfantsReel(e.target.value)}
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
        <LignesEditor produits={props.produits} lignes={lignes} onChange={setLignes} />
      </div>

      <fieldset className="space-y-4 rounded-md border border-stone-200 p-4">
        <legend className="px-1 text-sm font-semibold text-stone-900">Acompte (déduit de la facture)</legend>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <label htmlFor="acompteMontant" className={labelClass}>
              Montant (€)
            </label>
            <input
              id="acompteMontant"
              type="number"
              min={0}
              step="0.01"
              value={acompteMontant}
              onChange={(e) => setAcompteMontant(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="acompteStatut" className={labelClass}>
              Statut
            </label>
            <SelectStatut id="acompteStatut" value={acompteStatut} onChange={setAcompteStatut} />
          </div>
          {acompteStatut === "RECU" ? (
            <div className="space-y-1">
              <label htmlFor="acompteDate" className={labelClass}>
                Réglé le
              </label>
              <input
                id="acompteDate"
                type="date"
                value={acompteDate}
                onChange={(e) => setAcompteDate(e.target.value)}
                className={inputClass}
              />
            </div>
          ) : (
            <div />
          )}
        </div>
        {acompteStatut === "RECU" ? (
          <div className="space-y-1">
            <label htmlFor="acompteReference" className={labelClass}>
              Référence de règlement de l&apos;acompte
            </label>
            <input
              id="acompteReference"
              type="text"
              value={acompteReference}
              onChange={(e) => setAcompteReference(e.target.value)}
              className={inputClass}
            />
          </div>
        ) : null}
      </fieldset>

      <fieldset className="space-y-4 rounded-md border border-stone-200 p-4">
        <legend className="px-1 text-sm font-semibold text-stone-900">Règlement du solde</legend>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <label htmlFor="soldeStatut" className={labelClass}>
              Statut du solde
            </label>
            <SelectStatut id="soldeStatut" value={soldeStatut} onChange={setSoldeStatut} />
          </div>
          {soldeStatut === "RECU" ? (
            <>
              <div className="space-y-1">
                <label htmlFor="soldeDate" className={labelClass}>
                  Réglé le
                </label>
                <input
                  id="soldeDate"
                  type="date"
                  value={soldeDate}
                  onChange={(e) => setSoldeDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="soldeReference" className={labelClass}>
                  Référence
                </label>
                <input
                  id="soldeReference"
                  type="text"
                  value={soldeReference}
                  onChange={(e) => setSoldeReference(e.target.value)}
                  className={inputClass}
                />
              </div>
            </>
          ) : null}
        </div>
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
          placeholder="Note libre affichée sur la facture (optionnel)."
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="noteLitige" className={labelClass}>
          Note de litige
        </label>
        <textarea
          id="noteLitige"
          rows={2}
          value={noteLitige}
          onChange={(e) => setNoteLitige(e.target.value)}
          placeholder="Signaler un litige sur cette facture (n'empêche pas le workflow)."
          className={inputClass}
        />
      </div>

      <p className="text-sm text-stone-600">
        Total : <strong>{total.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</strong>
        {acompteDeduit > 0 ? (
          <>
            {" "}
            — acompte réglé : <strong>{acompteDeduit.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</strong>{" "}
            — reste à payer :{" "}
            <strong>{resteAPayer.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</strong>
          </>
        ) : null}
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
        {busy ? "Enregistrement…" : "Enregistrer la facture"}
      </button>
    </form>
  );
}
