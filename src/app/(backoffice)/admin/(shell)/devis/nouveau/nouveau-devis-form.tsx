"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import LignesEditor, {
  nouvelleLigneVide,
  type LigneItem,
  type ProduitOption,
} from "@/components/admin/LignesEditor";

interface ClientOption {
  id: string;
  nomOuRaisonSociale: string;
  email: string;
}

/** Combine une date (yyyy-mm-dd) et une heure (HH:mm) en ISO string, ou null si l'un des deux manque. */
function toIsoOrNull(date: string, heure: string): string | null {
  if (!date) return null;
  const iso = new Date(`${date}T${heure || "00:00"}`);
  return Number.isNaN(iso.getTime()) ? null : iso.toISOString();
}

export default function NouveauDevisForm({
  clients,
  produits,
}: {
  clients: ClientOption[];
  produits: ProduitOption[];
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [nbAdultes, setNbAdultes] = useState("1");
  const [nbEnfants, setNbEnfants] = useState("0");
  const [lignes, setLignes] = useState<LigneItem[]>([nouvelleLigneVide()]);
  const [date, setDate] = useState("");
  const [heure, setHeure] = useState("");
  const [dureeMinutes, setDureeMinutes] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!clientId) {
      setError("Sélectionnez un client (créez-en un d'abord si la liste est vide).");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/devis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
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
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Une erreur est survenue.");
        setSubmitting(false);
        return;
      }

      const body = (await response.json()) as { devis: { id: string } };
      router.push(`/admin/devis/${body.devis.id}`);
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
        <label htmlFor="clientId" className="text-sm font-medium text-stone-700">
          Client
        </label>
        {clients.length === 0 ? (
          <p className="text-sm text-red-600">
            Aucun compte client — créez-en un d&apos;abord depuis l&apos;onglet Comptes clients.
          </p>
        ) : (
          <select
            id="clientId"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nomOuRaisonSociale} ({c.email})
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="nbAdultes" className="text-sm font-medium text-stone-700">
            Adultes
          </label>
          <input
            id="nbAdultes"
            type="number"
            min={0}
            value={nbAdultes}
            onChange={(e) => setNbAdultes(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="nbEnfants" className="text-sm font-medium text-stone-700">
            Enfants
          </label>
          <input
            id="nbEnfants"
            type="number"
            min={0}
            value={nbEnfants}
            onChange={(e) => setNbEnfants(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <label htmlFor="date" className="text-sm font-medium text-stone-700">
            Date de la prestation
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="heure" className="text-sm font-medium text-stone-700">
            Heure
          </label>
          <input
            id="heure"
            type="time"
            value={heure}
            onChange={(e) => setHeure(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="dureeMinutes" className="text-sm font-medium text-stone-700">
            Durée (min)
          </label>
          <input
            id="dureeMinutes"
            type="number"
            min={0}
            value={dureeMinutes}
            onChange={(e) => setDureeMinutes(e.target.value)}
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
          placeholder="Note libre affichée sur le devis (optionnel)."
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={submitting || clients.length === 0}
        className="w-full rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Création…" : "Créer le devis"}
      </button>
    </form>
  );
}
