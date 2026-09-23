"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LignesEditor, {
  nouvelleLigneVide,
  type LigneItem,
  type ProduitOption,
} from "@/components/admin/LignesEditor";

interface FactureEditFormProps {
  factureId: string;
  nbAdultesReel: number;
  nbEnfantsReel: number;
  soldeStatutPaiement: "EN_ATTENTE" | "RECU" | "EXPIRE";
  noteLitige: string;
  notes: string;
  estRattachee: boolean;
  produits: ProduitOption[];
  lignesInitiales: LigneItem[];
}

export default function FactureEditForm({
  factureId,
  nbAdultesReel: initAdultes,
  nbEnfantsReel: initEnfants,
  soldeStatutPaiement: initStatut,
  noteLitige: initNote,
  notes: initNotes,
  estRattachee,
  produits,
  lignesInitiales,
}: FactureEditFormProps) {
  const router = useRouter();
  const [nbAdultesReel, setNbAdultesReel] = useState(String(initAdultes));
  const [nbEnfantsReel, setNbEnfantsReel] = useState(String(initEnfants));
  const [lignes, setLignes] = useState<LigneItem[]>(
    lignesInitiales.length > 0 ? lignesInitiales : [nouvelleLigneVide()]
  );
  const [notes, setNotes] = useState(initNotes);
  const [reference, setReference] = useState("");
  const [noteLitige, setNoteLitige] = useState(initNote);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/factures/${factureId}`, {
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

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {!estRattachee ? (
        <>
          <div className="space-y-4 rounded-lg border border-stone-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-stone-900">Modifier la facture</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-600">Adultes réel</label>
                <input
                  type="number"
                  min={0}
                  value={nbAdultesReel}
                  onChange={(e) => setNbAdultesReel(e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-600">Enfants réel</label>
                <input
                  type="number"
                  min={0}
                  value={nbEnfantsReel}
                  onChange={(e) => setNbEnfantsReel(e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium text-stone-700">Lignes</span>
              <LignesEditor produits={produits} lignes={lignes} onChange={setLignes} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-stone-600">Notes</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Note libre affichée sur la facture (optionnel)."
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
              />
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() =>
                patch({
                  nbAdultesReel: Number(nbAdultesReel),
                  nbEnfantsReel: Number(nbEnfantsReel),
                  lignes: lignes.map((l) => ({
                    produitId: l.produitId,
                    denomination: l.denomination,
                    quantite: Number(l.quantite),
                    prixUnitaire: Number(l.prixUnitaire),
                  })),
                  notes: notes || null,
                })
              }
              className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
            >
              Enregistrer
            </button>
          </div>

          {initStatut !== "RECU" ? (
            <div className="space-y-3 rounded-lg border border-stone-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-stone-900">Pointer le solde reçu</h2>
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
                onClick={() =>
                  patch({ soldeStatutPaiement: "RECU", soldeReferenceReglement: reference || null })
                }
                className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
              >
                Marquer le solde comme reçu
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      <div className="space-y-3 rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-stone-900">Note de litige</h2>
        <textarea
          rows={3}
          value={noteLitige}
          onChange={(e) => setNoteLitige(e.target.value)}
          placeholder="Signaler un litige sur cette facture (n'empêche pas le workflow)."
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => patch({ noteLitige: noteLitige || null })}
          className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-60"
        >
          Enregistrer la note
        </button>
      </div>
    </div>
  );
}
