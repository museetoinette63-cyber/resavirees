"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DevisEditFormProps {
  devisId: string;
  nbAdultes: number;
  nbEnfants: number;
  montantTotal: string;
  acompteStatutPaiement: "EN_ATTENTE" | "RECU" | "EXPIRE";
  hasFacture: boolean;
}

export default function DevisEditForm({
  devisId,
  nbAdultes: initAdultes,
  nbEnfants: initEnfants,
  montantTotal: initMontant,
  acompteStatutPaiement: initStatut,
  hasFacture,
}: DevisEditFormProps) {
  const router = useRouter();
  const [nbAdultes, setNbAdultes] = useState(String(initAdultes));
  const [nbEnfants, setNbEnfants] = useState(String(initEnfants));
  const [montantTotal, setMontantTotal] = useState(initMontant);
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/devis/${devisId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const b = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(b?.error ?? "Une erreur est survenue.");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveMontants() {
    await patch({
      nbAdultes: Number(nbAdultes),
      nbEnfants: Number(nbEnfants),
      montantTotal: Number(montantTotal),
    });
  }

  async function handlePointerAcompte() {
    await patch({ acompteStatutPaiement: "RECU", acompteReferenceReglement: reference || null });
  }

  async function handleCreerFacture() {
    setError(null);
    setBusy(true);
    try {
      const response = await fetch("/api/admin/factures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devisId }),
      });
      if (!response.ok) {
        const b = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(b?.error ?? "Une erreur est survenue.");
        setBusy(false);
        return;
      }
      const b = (await response.json()) as { facture: { id: string } };
      router.push(`/admin/factures/${b.facture.id}`);
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="space-y-3 rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-stone-900">Modifier le devis</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-600">Adultes</label>
            <input
              type="number"
              min={0}
              value={nbAdultes}
              onChange={(e) => setNbAdultes(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-600">Enfants</label>
            <input
              type="number"
              min={0}
              value={nbEnfants}
              onChange={(e) => setNbEnfants(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-600">Montant (€)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={montantTotal}
              onChange={(e) => setMontantTotal(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
            />
          </div>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={handleSaveMontants}
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
        >
          Enregistrer
        </button>
      </div>

      {initStatut !== "RECU" ? (
        <div className="space-y-3 rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-stone-900">Pointer l&apos;acompte reçu</h2>
          <input
            type="text"
            placeholder="Référence de règlement (optionnel)"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={busy}
            onClick={handlePointerAcompte}
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
          >
            Marquer l&apos;acompte comme reçu
          </button>
        </div>
      ) : null}

      {!hasFacture ? (
        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <button
            type="button"
            disabled={busy}
            onClick={handleCreerFacture}
            className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-60"
          >
            Créer la facture à partir de ce devis
          </button>
        </div>
      ) : null}
    </div>
  );
}
