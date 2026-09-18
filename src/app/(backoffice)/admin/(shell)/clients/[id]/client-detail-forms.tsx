"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface ClientInfo {
  id: string;
  nomOuRaisonSociale: string;
  email: string;
  telephone: string | null;
  adressePostale: string | null;
  notes: string | null;
}

export function EditClientForm({ client }: { client: ClientInfo }) {
  const router = useRouter();
  const [form, setForm] = useState({
    nomOuRaisonSociale: client.nomOuRaisonSociale,
    email: client.email,
    telephone: client.telephone ?? "",
    adressePostale: client.adressePostale ?? "",
    notes: client.notes ?? "",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Erreur lors de la mise à jour.");
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {saved ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Enregistré.</p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-stone-600">Nom / raison sociale</label>
          <input
            value={form.nomOuRaisonSociale}
            onChange={(e) => setForm({ ...form, nomOuRaisonSociale: e.target.value })}
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-stone-600">E-mail</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-stone-600">Téléphone</label>
          <input
            value={form.telephone}
            onChange={(e) => setForm({ ...form, telephone: e.target.value })}
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-stone-600">Adresse postale</label>
          <input
            value={form.adressePostale}
            onChange={(e) => setForm({ ...form, adressePostale: e.target.value })}
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm"
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-stone-600">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={2}
          className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
      >
        {pending ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}

export function ManualDevisForm({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ nbAdultes: 1, nbEnfants: 0, montantTotal: "0" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/devis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nbAdultes: Number(form.nbAdultes),
          nbEnfants: Number(form.nbEnfants),
          montantTotal: Number(form.montantTotal),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Erreur lors de la création du devis.");
      }
      setForm({ nbAdultes: 1, nbEnfants: 0, montantTotal: "0" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      {error ? <p className="w-full rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <div>
        <label className="block text-xs font-medium text-stone-600">Adultes</label>
        <input
          type="number"
          min={0}
          value={form.nbAdultes}
          onChange={(e) => setForm({ ...form, nbAdultes: Number(e.target.value) })}
          className="mt-1 w-20 rounded-md border border-stone-300 px-3 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-600">Enfants</label>
        <input
          type="number"
          min={0}
          value={form.nbEnfants}
          onChange={(e) => setForm({ ...form, nbEnfants: Number(e.target.value) })}
          className="mt-1 w-20 rounded-md border border-stone-300 px-3 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-600">Montant total (€)</label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={form.montantTotal}
          onChange={(e) => setForm({ ...form, montantTotal: e.target.value })}
          className="mt-1 w-28 rounded-md border border-stone-300 px-3 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100 disabled:opacity-50"
      >
        Ajouter un devis manuel
      </button>
    </form>
  );
}

export function ManualFactureForm({
  clientId,
  devisOptions,
}: {
  clientId: string;
  devisOptions: { id: string; numero: string; montantTotal: string }[];
}) {
  const router = useRouter();
  const [devisId, setDevisId] = useState(devisOptions[0]?.id ?? "");
  const [montantFinal, setMontantFinal] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (devisOptions.length === 0) {
    return (
      <p className="text-sm text-stone-500">
        Aucun devis sans facture pour ce client. Ajoutez d&apos;abord un devis.
      </p>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/facture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          devisId,
          ...(montantFinal ? { montantFinal: Number(montantFinal) } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Erreur lors de la création de la facture.");
      }
      setMontantFinal("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      {error ? <p className="w-full rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <div>
        <label className="block text-xs font-medium text-stone-600">Devis</label>
        <select
          value={devisId}
          onChange={(e) => setDevisId(e.target.value)}
          className="mt-1 rounded-md border border-stone-300 px-3 py-1.5 text-sm"
        >
          {devisOptions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.numero} — {d.montantTotal} €
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-600">Montant final (€, optionnel)</label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={montantFinal}
          onChange={(e) => setMontantFinal(e.target.value)}
          placeholder="= montant du devis"
          className="mt-1 w-36 rounded-md border border-stone-300 px-3 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100 disabled:opacity-50"
      >
        Ajouter une facture manuelle
      </button>
    </form>
  );
}
