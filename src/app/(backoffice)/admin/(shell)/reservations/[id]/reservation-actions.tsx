"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReservationStatus } from "@prisma/client";

type StatutPaiement = "EN_ATTENTE" | "RECU" | "EXPIRE";

export interface SerializedDevis {
  id: string;
  montantTotal: string;
  acompteMontant: string;
  acompteDateLimite: string | null;
  acompteStatutPaiement: StatutPaiement;
}

export interface SerializedFacture {
  id: string;
  montantFinal: string;
  nbAdultesReel: number;
  nbEnfantsReel: number;
  soldeStatutPaiement: StatutPaiement;
  noteLitige: string | null;
}

/**
 * Panneau d'actions de l'écran de détail réservation : un bloc par
 * transition manuelle possible, conditionné sur `status` — reflète
 * exactement les actions décrites dans le cahier des charges pour chaque
 * statut (voir aussi TRANSITIONS dans reservationWorkflow/transitions.ts,
 * dont ce composant est un sous-ensemble délibéré : les transitions
 * automatiques du parcours de création de réservation, hors périmètre admin,
 * n'ont pas de bouton ici).
 */
export default function ReservationActions({
  reservationId,
  status,
  devis,
  facture,
  canCancel,
}: {
  reservationId: string;
  status: ReservationStatus;
  devis: SerializedDevis | null;
  facture: SerializedFacture | null;
  canCancel: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [acompteDate, setAcompteDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [acompteRef, setAcompteRef] = useState("");

  const [soldeDate, setSoldeDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [soldeRef, setSoldeRef] = useState("");

  const [nbAdultesReel, setNbAdultesReel] = useState(facture?.nbAdultesReel ?? 0);
  const [nbEnfantsReel, setNbEnfantsReel] = useState(facture?.nbEnfantsReel ?? 0);
  const [montantFinal, setMontantFinal] = useState(facture?.montantFinal ?? "0");

  const [note, setNote] = useState("");
  const [litigeNote, setLitigeNote] = useState(facture?.noteLitige ?? "");

  async function callTransition(to: string, opts?: { note?: string; extra?: Record<string, unknown> }) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reservations/${reservationId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, note: opts?.note, extra: opts?.extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Erreur lors de la transition.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setPending(false);
    }
  }

  async function postNote(target: "notesAdmin" | "litige", value: string) {
    if (!value.trim()) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reservations/${reservationId}/note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: value, target }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Erreur lors de l'enregistrement de la note.");
      }
      if (target === "notesAdmin") setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setPending(false);
    }
  }

  // `Date.now()` est traité comme impur par la règle react-hooks/purity ;
  // `new Date()` (sans argument) ne l'est pas, donc on l'utilise ici pour
  // rester une valeur dérivée calculée directement pendant le rendu, sans
  // avoir besoin d'un effet.
  const acompteExpireDepassee =
    status === "ACOMPTE_EN_ATTENTE" &&
    !!devis?.acompteDateLimite &&
    new Date(devis.acompteDateLimite).getTime() < new Date().getTime();

  return (
    <div className="space-y-6">
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {acompteExpireDepassee ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">
            La date limite de règlement de l&apos;acompte est dépassée.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => callTransition("ACOMPTE_EXPIRE")}
            className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
          >
            Marquer l&apos;acompte expiré
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {status === "EN_ATTENTE_VALIDATION_ADMIN" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => callTransition("DEVIS_VALIDE")}
            className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
          >
            Valider le devis
          </button>
        ) : null}

        {status === "DEVIS_VALIDE" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (window.confirm("Le devis (PDF) sera envoyé au client par e-mail. Continuer ?")) {
                callTransition("DEVIS_ENVOYE");
              }
            }}
            className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
          >
            Envoyer le devis au client
          </button>
        ) : null}

        {status === "CONFIRME" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => callTransition("REALISE")}
            className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
          >
            Marquer réalisé
          </button>
        ) : null}

        {status === "FACTURE_AJUSTEE" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (window.confirm("La facture (PDF) sera envoyée au client par e-mail. Continuer ?")) {
                callTransition("FACTURE_ENVOYEE");
              }
            }}
            className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
          >
            Envoyer la facture
          </button>
        ) : null}
      </div>

      {(status === "ACOMPTE_EN_ATTENTE" || status === "ACOMPTE_EXPIRE") && devis ? (
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-stone-900">Pointer l&apos;acompte reçu</h3>
          <p className="mt-1 text-xs text-stone-500">
            Enregistre le règlement de l&apos;acompte ({devis.acompteMontant} €) puis passe la
            réservation à « Confirmé ».
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600">Date de règlement</label>
              <input
                type="date"
                value={acompteDate}
                onChange={(e) => setAcompteDate(e.target.value)}
                className="mt-1 rounded-md border border-stone-300 px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600">Référence de règlement</label>
              <input
                type="text"
                value={acompteRef}
                onChange={(e) => setAcompteRef(e.target.value)}
                placeholder="ex. VIR-12345"
                className="mt-1 rounded-md border border-stone-300 px-3 py-1.5 text-sm"
              />
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                callTransition("CONFIRME", {
                  extra: { acompteDateReglement: acompteDate, acompteReferenceReglement: acompteRef },
                })
              }
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              Pointer le règlement et confirmer
            </button>
          </div>
        </div>
      ) : null}

      {status === "REALISE" && facture ? (
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-stone-900">Ajuster la facture</h3>
          <p className="mt-1 text-xs text-stone-500">
            Optionnel : corrige le nombre de participants réel et/ou le montant final avant envoi.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600">Adultes réels</label>
              <input
                type="number"
                min={0}
                value={nbAdultesReel}
                onChange={(e) => setNbAdultesReel(Number(e.target.value))}
                className="mt-1 w-24 rounded-md border border-stone-300 px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600">Enfants réels</label>
              <input
                type="number"
                min={0}
                value={nbEnfantsReel}
                onChange={(e) => setNbEnfantsReel(Number(e.target.value))}
                className="mt-1 w-24 rounded-md border border-stone-300 px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600">Montant final (€)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={montantFinal}
                onChange={(e) => setMontantFinal(e.target.value)}
                className="mt-1 w-32 rounded-md border border-stone-300 px-3 py-1.5 text-sm"
              />
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                callTransition("FACTURE_AJUSTEE", {
                  extra: {
                    nbAdultesReel,
                    nbEnfantsReel,
                    montantFinal: Number(montantFinal),
                  },
                })
              }
              className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100 disabled:opacity-50"
            >
              Ajuster la facture
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (window.confirm("La facture (PDF) sera envoyée au client par e-mail. Continuer ?")) {
                  callTransition("FACTURE_ENVOYEE");
                }
              }}
              className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
            >
              Envoyer la facture directement
            </button>
          </div>
        </div>
      ) : null}

      {status === "FACTURE_ENVOYEE" && facture ? (
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-stone-900">Pointer le solde reçu</h3>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600">Date de règlement</label>
              <input
                type="date"
                value={soldeDate}
                onChange={(e) => setSoldeDate(e.target.value)}
                className="mt-1 rounded-md border border-stone-300 px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600">Référence de règlement</label>
              <input
                type="text"
                value={soldeRef}
                onChange={(e) => setSoldeRef(e.target.value)}
                placeholder="ex. VIR-67890"
                className="mt-1 rounded-md border border-stone-300 px-3 py-1.5 text-sm"
              />
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                callTransition("SOLDE", {
                  extra: { soldeDateReglement: soldeDate, soldeReferenceReglement: soldeRef },
                })
              }
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              Pointer le solde
            </button>
          </div>
        </div>
      ) : null}

      {facture ? (
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-stone-900">Note de litige (facture)</h3>
          <textarea
            value={litigeNote}
            onChange={(e) => setLitigeNote(e.target.value)}
            rows={2}
            className="mt-2 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            placeholder="Litige éventuel sur cette facture..."
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => postNote("litige", litigeNote)}
            className="mt-2 rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100 disabled:opacity-50"
          >
            Enregistrer la note de litige
          </button>
        </div>
      ) : null}

      <div className="rounded-lg border border-stone-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-stone-900">Ajouter une note interne</h3>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="mt-2 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          placeholder="Note visible uniquement par l'équipe..."
        />
        <button
          type="button"
          disabled={pending || !note.trim()}
          onClick={() => postNote("notesAdmin", note)}
          className="mt-2 rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100 disabled:opacity-50"
        >
          Ajouter la note
        </button>
      </div>

      {canCancel ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="text-sm font-semibold text-red-900">Annuler la réservation</h3>
          <p className="mt-1 text-xs text-red-700">
            Masque le créneau et signale un éventuel remboursement d&apos;acompte à traiter
            manuellement.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (
                window.confirm("Confirmer l'annulation de cette réservation ? Cette action est irréversible.")
              ) {
                const cancelNote = window.prompt("Note (optionnelle) sur le motif d'annulation :");
                callTransition("ANNULE", { note: cancelNote || undefined });
              }
            }}
            className="mt-3 rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
          >
            Annuler la réservation
          </button>
        </div>
      ) : null}
    </div>
  );
}
