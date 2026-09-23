"use client";

import { useMemo } from "react";

export interface ProduitOption {
  id: string;
  nom: string;
  prixUnitaire: string; // Decimal sérialisé en string (JSON ne sait pas encoder Prisma.Decimal)
  dureeMinutes: number | null;
}

export interface LigneItem {
  produitId: string | null; // null = ligne libre
  denomination: string;
  quantite: string;
  prixUnitaire: string;
}

/** Valeur du <select> quand aucun produit du catalogue n'est choisi. */
export const LIGNE_LIBRE_VALUE = "__libre__";

export function nouvelleLigneVide(): LigneItem {
  return { produitId: null, denomination: "", quantite: "1", prixUnitaire: "0" };
}

function formatMontant(value: number): string {
  return value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

interface LignesEditorProps {
  produits: ProduitOption[];
  lignes: LigneItem[];
  onChange: (lignes: LigneItem[]) => void;
}

/**
 * Éditeur de lignes de devis/facture, répétable. Chaque ligne choisit soit
 * un produit du catalogue (dénomination + prix unitaire pré-remplis depuis
 * `Produit`, mais librement modifiables ensuite), soit "— Ligne libre —"
 * pour saisir une dénomination et un prix à la main. Le montant par ligne et
 * le total général sont calculés en direct côté client (`useMemo`, même
 * esprit que l'aperçu de prix live de `ReservationForm.tsx`) ; le serveur
 * recalcule et fait foi à la soumission (voir les routes API concernées).
 */
export default function LignesEditor({ produits, lignes, onChange }: LignesEditorProps) {
  const total = useMemo(
    () =>
      lignes.reduce((sum, l) => {
        const q = Number(l.quantite) || 0;
        const p = Number(l.prixUnitaire) || 0;
        return sum + q * p;
      }, 0),
    [lignes]
  );

  function updateLigne(index: number, patch: Partial<LigneItem>) {
    onChange(lignes.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function handleSelectProduit(index: number, value: string) {
    if (value === LIGNE_LIBRE_VALUE) {
      updateLigne(index, { produitId: null });
      return;
    }
    const produit = produits.find((p) => p.id === value);
    if (!produit) return;
    updateLigne(index, {
      produitId: produit.id,
      denomination: produit.nom,
      prixUnitaire: produit.prixUnitaire,
    });
  }

  function addLigne() {
    onChange([...lignes, nouvelleLigneVide()]);
  }

  function removeLigne(index: number) {
    onChange(lignes.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {lignes.map((ligne, index) => {
          const montantLigne = (Number(ligne.quantite) || 0) * (Number(ligne.prixUnitaire) || 0);
          return (
            <div
              key={index}
              className="grid grid-cols-12 items-end gap-2 rounded-md border border-stone-200 bg-stone-50 p-3"
            >
              <div className="col-span-12 space-y-1 sm:col-span-3">
                <label className="text-xs font-medium text-stone-600">Produit</label>
                <select
                  value={ligne.produitId ?? LIGNE_LIBRE_VALUE}
                  onChange={(e) => handleSelectProduit(index, e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
                >
                  <option value={LIGNE_LIBRE_VALUE}>— Ligne libre —</option>
                  {produits.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-12 space-y-1 sm:col-span-4">
                <label className="text-xs font-medium text-stone-600">Dénomination</label>
                <input
                  type="text"
                  value={ligne.denomination}
                  onChange={(e) => updateLigne(index, { denomination: e.target.value })}
                  className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div className="col-span-4 space-y-1 sm:col-span-1">
                <label className="text-xs font-medium text-stone-600">Qté</label>
                <input
                  type="number"
                  min={1}
                  step="1"
                  value={ligne.quantite}
                  onChange={(e) => updateLigne(index, { quantite: e.target.value })}
                  className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div className="col-span-4 space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-stone-600">Prix unitaire (€)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={ligne.prixUnitaire}
                  onChange={(e) => updateLigne(index, { prixUnitaire: e.target.value })}
                  className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div className="col-span-3 space-y-1 sm:col-span-1">
                <span className="block text-xs font-medium text-stone-600">Montant</span>
                <p className="px-1 py-1.5 text-sm font-medium text-stone-900">
                  {formatMontant(montantLigne)}
                </p>
              </div>
              <div className="col-span-1 flex justify-end sm:col-span-1">
                <button
                  type="button"
                  onClick={() => removeLigne(index)}
                  disabled={lignes.length <= 1}
                  title="Supprimer la ligne"
                  aria-label="Supprimer la ligne"
                  className="rounded-md px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addLigne}
        className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100"
      >
        + Ajouter une ligne
      </button>

      <div className="flex items-baseline justify-end gap-2 border-t border-stone-200 pt-3">
        <span className="text-sm font-medium text-stone-600">Total</span>
        <span className="text-lg font-semibold text-stone-900">{formatMontant(total)}</span>
      </div>
    </div>
  );
}

export interface LigneReadOnly {
  id: string;
  denomination: string;
  quantite: number;
  prixUnitaire: string;
  montantLigne: string;
}

/** Tableau de lignes en lecture seule — devis/facture rattaché(e) à une réservation. */
export function LignesReadOnlyTable({ lignes }: { lignes: LigneReadOnly[] }) {
  const total = lignes.reduce((sum, l) => sum + Number(l.montantLigne), 0);
  return (
    <div className="overflow-hidden rounded-md border border-stone-200">
      <table className="w-full text-sm">
        <thead className="bg-stone-50 text-xs uppercase text-stone-500">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Dénomination</th>
            <th className="px-3 py-2 text-right font-medium">Quantité</th>
            <th className="px-3 py-2 text-right font-medium">Prix unitaire</th>
            <th className="px-3 py-2 text-right font-medium">Montant</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.id} className="border-t border-stone-100">
              <td className="px-3 py-2">{l.denomination}</td>
              <td className="px-3 py-2 text-right">{l.quantite}</td>
              <td className="px-3 py-2 text-right">{formatMontant(Number(l.prixUnitaire))}</td>
              <td className="px-3 py-2 text-right">{formatMontant(Number(l.montantLigne))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-stone-200 bg-stone-50 font-medium">
            <td className="px-3 py-2" colSpan={3}>
              Total
            </td>
            <td className="px-3 py-2 text-right">{formatMontant(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
