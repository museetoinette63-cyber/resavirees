"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface ClientOption {
  id: string;
  nomOuRaisonSociale: string;
  email: string;
}

export default function NouveauDevisForm({ clients }: { clients: ClientOption[] }) {
  const router = useRouter();
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [nbAdultes, setNbAdultes] = useState("1");
  const [nbEnfants, setNbEnfants] = useState("0");
  const [montantTotal, setMontantTotal] = useState("");
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
          montantTotal: Number(montantTotal),
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
      className="space-y-4 rounded-lg border border-stone-200 bg-white p-6 shadow-sm"
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

      <div className="space-y-1">
        <label htmlFor="montantTotal" className="text-sm font-medium text-stone-700">
          Montant total (€)
        </label>
        <input
          id="montantTotal"
          type="number"
          min={0}
          step="0.01"
          required
          value={montantTotal}
          onChange={(e) => setMontantTotal(e.target.value)}
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
