"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { produitSchema } from "@/lib/validation/produitSchema";

export type ProduitFormInitialData = {
  nom: string;
  description: string | null;
  prixUnitaire: string;
  dureeMinutes: number | null;
  actif: boolean;
  visiteId: string | null;
};

export type VisiteOption = { id: string; nom: string };

export default function ProduitForm({
  mode,
  produitId,
  initialData,
  visites,
}: {
  mode: "create" | "edit";
  produitId?: string;
  initialData?: ProduitFormInitialData;
  visites: VisiteOption[];
}) {
  const router = useRouter();

  const [nom, setNom] = useState(initialData?.nom ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [prixUnitaire, setPrixUnitaire] = useState(initialData?.prixUnitaire ?? "");
  const [dureeMinutes, setDureeMinutes] = useState(
    initialData?.dureeMinutes != null ? String(initialData.dureeMinutes) : ""
  );
  const [actif, setActif] = useState(initialData?.actif ?? true);
  const [visiteId, setVisiteId] = useState(initialData?.visiteId ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    setFieldErrors({});

    const payload = {
      nom,
      description: description.trim() ? description : null,
      prixUnitaire: Number(prixUnitaire),
      dureeMinutes: dureeMinutes.trim() ? Number(dureeMinutes) : null,
      actif,
      visiteId: visiteId || null,
    };

    const parsed = produitSchema.safeParse(payload);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      setErrors(flat.formErrors);
      setFieldErrors(flat.fieldErrors as Record<string, string[]>);
      return;
    }

    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/admin/produits" : `/api/admin/produits/${produitId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = await res.json();
      if (!res.ok) {
        const flat = body?.error;
        if (flat?.formErrors || flat?.fieldErrors) {
          setErrors(flat.formErrors ?? []);
          setFieldErrors(flat.fieldErrors ?? {});
        } else {
          setErrors([typeof flat === "string" ? flat : "Échec de l'enregistrement."]);
        }
        return;
      }

      if (mode === "create") {
        router.push(`/admin/produits/${body.produit.id}`);
      } else {
        router.push("/admin/produits");
      }
      router.refresh();
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Erreur inconnue."]);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none";
  const labelClass = "text-sm font-medium text-stone-700";

  function fieldError(name: string) {
    const msgs = fieldErrors[name];
    return msgs && msgs.length > 0 ? (
      <p className="mt-1 text-xs text-red-600">{msgs[0]}</p>
    ) : null;
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
      {errors.length > 0 ? (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          <ul className="list-inside list-disc">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <section className="space-y-4 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-stone-900">Informations générales</h2>

        <div className="space-y-1">
          <label className={labelClass} htmlFor="nom">Nom</label>
          <input id="nom" className={inputClass} value={nom} onChange={(e) => setNom(e.target.value)} required />
          {fieldError("nom")}
        </div>

        <div className="space-y-1">
          <label className={labelClass} htmlFor="description">Description</label>
          <textarea
            id="description"
            className={inputClass}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optionnelle"
          />
          {fieldError("description")}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className={labelClass} htmlFor="prixUnitaire">Prix unitaire (€)</label>
            <input
              id="prixUnitaire"
              type="number"
              step="0.01"
              min="0"
              className={inputClass}
              value={prixUnitaire}
              onChange={(e) => setPrixUnitaire(e.target.value)}
              required
            />
            {fieldError("prixUnitaire")}
          </div>
          <div className="space-y-1">
            <label className={labelClass} htmlFor="dureeMinutes">Durée (minutes)</label>
            <input
              id="dureeMinutes"
              type="number"
              step="1"
              min="0"
              className={inputClass}
              value={dureeMinutes}
              onChange={(e) => setDureeMinutes(e.target.value)}
              placeholder="Optionnelle"
            />
            {fieldError("dureeMinutes")}
          </div>
        </div>

        <div className="space-y-1">
          <label className={labelClass} htmlFor="visiteId">Visite liée</label>
          <select
            id="visiteId"
            className={inputClass}
            value={visiteId}
            onChange={(e) => setVisiteId(e.target.value)}
          >
            <option value="">— Aucune (produit indépendant) —</option>
            {visites.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nom}
              </option>
            ))}
          </select>
          {fieldError("visiteId")}
        </div>

        <div className="flex items-center gap-2">
          <input
            id="actif"
            type="checkbox"
            checked={actif}
            onChange={(e) => setActif(e.target.checked)}
          />
          <label className={labelClass} htmlFor="actif">Actif (proposable sur un devis/facture)</label>
        </div>
      </section>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {submitting ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
