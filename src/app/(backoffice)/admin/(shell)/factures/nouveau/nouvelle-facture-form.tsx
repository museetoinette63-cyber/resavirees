"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import LignesEditor, {
  nouvelleLigneVide,
  type LigneItem,
  type ProduitOption,
} from "@/components/admin/LignesEditor";

interface DevisOption {
  id: string;
  label: string;
  nbAdultes: number;
  nbEnfants: number;
  lignes: LigneItem[];
}

export default function NouvelleFactureForm({
  devisOptions,
  produits,
}: {
  devisOptions: DevisOption[];
  produits: ProduitOption[];
}) {
  const router = useRouter();
  const [devisId, setDevisId] = useState(devisOptions[0]?.id ?? "");
  const selected = useMemo(() => devisOptions.find((d) => d.id === devisId), [devisOptions, devisId]);
  const [nbAdultesReel, setNbAdultesReel] = useState(String(selected?.nbAdultes ?? 0));
  const [nbEnfantsReel, setNbEnfantsReel] = useState(String(selected?.nbEnfants ?? 0));
  const [lignes, setLignes] = useState<LigneItem[]>(
    selected && selected.lignes.length > 0 ? selected.lignes : [nouvelleLigneVide()]
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleSelectDevis(id: string) {
    setDevisId(id);
    const d = devisOptions.find((o) => o.id === id);
    setNbAdultesReel(String(d?.nbAdultes ?? 0));
    setNbEnfantsReel(String(d?.nbEnfants ?? 0));
    setLignes(d && d.lignes.length > 0 ? d.lignes : [nouvelleLigneVide()]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!devisId) {
      setError("Sélectionnez un devis (il faut un devis sans facture existante).");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/factures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          devisId,
          nbAdultesReel: Number(nbAdultesReel),
          nbEnfantsReel: Number(nbEnfantsReel),
          lignes: lignes.map((l) => ({
            produitId: l.produitId,
            denomination: l.denomination,
            quantite: Number(l.quantite),
            prixUnitaire: Number(l.prixUnitaire),
          })),
          notes: notes || null,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Une erreur est survenue.");
        setSubmitting(false);
        return;
      }

      const body = (await response.json()) as { facture: { id: string } };
      router.push(`/admin/factures/${body.facture.id}`);
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-lg border border-stone-200 bg-white p-6 shadow-sm"
    >
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="space-y-1">
        <label htmlFor="devisId" className="text-sm font-medium text-stone-700">
          Devis
        </label>
        {devisOptions.length === 0 ? (
          <p className="text-sm text-red-600">
            Aucun devis sans facture disponible — créez d&apos;abord un devis.
          </p>
        ) : (
          <select
            id="devisId"
            value={devisId}
            onChange={(e) => handleSelectDevis(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
          >
            {devisOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-stone-700">Adultes réel</label>
          <input
            type="number"
            min={0}
            value={nbAdultesReel}
            onChange={(e) => setNbAdultesReel(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-stone-700">Enfants réel</label>
          <input
            type="number"
            min={0}
            value={nbEnfantsReel}
            onChange={(e) => setNbEnfantsReel(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium text-stone-700">Lignes</span>
        <LignesEditor produits={produits} lignes={lignes} onChange={setLignes} />
      </div>

      <div className="space-y-1">
        <label htmlFor="notes" className="text-sm font-medium text-stone-700">
          Notes
        </label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Note libre affichée sur la facture (optionnel)."
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={submitting || devisOptions.length === 0}
        className="w-full rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Création…" : "Créer la facture"}
      </button>
    </form>
  );
}
