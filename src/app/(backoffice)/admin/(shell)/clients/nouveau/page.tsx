"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NouveauClientPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nomOuRaisonSociale: "",
    email: "",
    telephone: "",
    adressePostale: "",
    notes: "",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Erreur lors de la création.");
      }
      router.push(`/admin/clients/${data.client.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <Link href="/admin/clients" className="text-sm text-stone-500 hover:underline">
          ← Comptes clients
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-stone-900">Nouveau client</h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-stone-200 bg-white p-6">
        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <div className="space-y-1">
          <label className="text-sm font-medium text-stone-700">Nom / raison sociale *</label>
          <input
            required
            value={form.nomOuRaisonSociale}
            onChange={(e) => setForm({ ...form, nomOuRaisonSociale: e.target.value })}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-stone-700">E-mail *</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-stone-700">Téléphone</label>
          <input
            value={form.telephone}
            onChange={(e) => setForm({ ...form, telephone: e.target.value })}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-stone-700">Adresse postale</label>
          <textarea
            value={form.adressePostale}
            onChange={(e) => setForm({ ...form, adressePostale: e.target.value })}
            rows={2}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-stone-700">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {pending ? "Création..." : "Créer le client"}
        </button>
      </form>
    </div>
  );
}
