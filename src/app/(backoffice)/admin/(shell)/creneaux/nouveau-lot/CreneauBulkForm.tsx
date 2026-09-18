"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creneauBulkSchema } from "@/lib/validation/creneauBulkSchema";

const JOURS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 0, label: "Dimanche" },
];

type PreviewResult = {
  joursCount: number;
  horairesCount: number;
  totalCreneaux: number;
  sampleDates: string[];
};

export default function CreneauBulkForm({ visites }: { visites: { id: string; nom: string }[] }) {
  const router = useRouter();

  const [visiteId, setVisiteId] = useState(visites[0]?.id ?? "");
  const [joursDeSemaine, setJoursDeSemaine] = useState<number[]>([]);
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [horaires, setHoraires] = useState<string[]>([""]);

  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [creating, setCreating] = useState(false);

  function toggleJour(value: number) {
    setPreview(null);
    setJoursDeSemaine((prev) =>
      prev.includes(value) ? prev.filter((j) => j !== value) : [...prev, value]
    );
  }

  function updateHoraire(index: number, value: string) {
    setPreview(null);
    setHoraires((prev) => prev.map((h, i) => (i === index ? value : h)));
  }

  function addHoraire() {
    setPreview(null);
    setHoraires((prev) => [...prev, ""]);
  }

  function removeHoraire(index: number) {
    setPreview(null);
    setHoraires((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  function buildPayload() {
    return {
      visiteId,
      joursDeSemaine,
      dateDebut,
      dateFin,
      horaires: horaires.filter((h) => h.trim() !== ""),
    };
  }

  function validate(): ReturnType<typeof creneauBulkSchema.safeParse> | null {
    const parsed = creneauBulkSchema.safeParse(buildPayload());
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const msgs = [...flat.formErrors];
      for (const fieldMsgs of Object.values(flat.fieldErrors)) {
        if (fieldMsgs) msgs.push(...fieldMsgs);
      }
      setErrors(msgs);
      return null;
    }
    setErrors([]);
    return parsed;
  }

  async function handlePreview() {
    const parsed = validate();
    if (!parsed) return;
    setLoadingPreview(true);
    setPreview(null);
    try {
      const res = await fetch("/api/admin/creneaux/bulk/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error?.formErrors?.[0] ?? "Échec du calcul de l'aperçu.");
      }
      setPreview(body);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Erreur inconnue."]);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleConfirm() {
    const parsed = validate();
    if (!parsed) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/creneaux/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error?.formErrors?.[0] ?? "Échec de la création des créneaux.");
      }
      router.push("/admin/creneaux");
      router.refresh();
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Erreur inconnue."]);
    } finally {
      setCreating(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none";
  const labelClass = "text-sm font-medium text-stone-700";

  return (
    <div className="max-w-2xl space-y-6">
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
        <div className="space-y-1">
          <label className={labelClass} htmlFor="visite">Visite</label>
          <select
            id="visite"
            className={inputClass}
            value={visiteId}
            onChange={(e) => {
              setPreview(null);
              setVisiteId(e.target.value);
            }}
          >
            {visites.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nom}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <p className={labelClass}>Jours de la semaine</p>
          <div className="flex flex-wrap gap-3">
            {JOURS.map((jour) => (
              <label key={jour.value} className="flex items-center gap-1.5 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={joursDeSemaine.includes(jour.value)}
                  onChange={() => toggleJour(jour.value)}
                />
                {jour.label}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className={labelClass} htmlFor="dateDebut">Date de début</label>
            <input
              id="dateDebut"
              type="date"
              className={inputClass}
              value={dateDebut}
              onChange={(e) => {
                setPreview(null);
                setDateDebut(e.target.value);
              }}
            />
          </div>
          <div className="space-y-1">
            <label className={labelClass} htmlFor="dateFin">Date de fin</label>
            <input
              id="dateFin"
              type="date"
              className={inputClass}
              value={dateFin}
              onChange={(e) => {
                setPreview(null);
                setDateFin(e.target.value);
              }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className={labelClass}>Horaires</p>
          {horaires.map((horaire, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="time"
                className={inputClass}
                value={horaire}
                onChange={(e) => updateHoraire(index, e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeHoraire(index)}
                disabled={horaires.length <= 1}
                className="text-sm text-red-600 underline hover:text-red-800 disabled:cursor-not-allowed disabled:text-stone-300"
              >
                Retirer
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addHoraire}
            className="text-sm text-stone-600 underline hover:text-stone-900"
          >
            + Ajouter un horaire
          </button>
        </div>
      </section>

      {preview ? (
        <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-stone-900">
            Ceci va créer {preview.totalCreneaux} créneau(x) ({preview.joursCount} date(s) ×{" "}
            {preview.horairesCount} horaire(s)).
          </p>
          {preview.sampleDates.length > 0 ? (
            <p className="mt-2 text-xs text-stone-500">
              Exemples de dates : {preview.sampleDates.join(", ")}
              {preview.joursCount > preview.sampleDates.length ? "…" : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex gap-3">
        {!preview ? (
          <button
            type="button"
            onClick={handlePreview}
            disabled={loadingPreview}
            className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
          >
            {loadingPreview ? "Calcul…" : "Aperçu"}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={creating}
              className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
            >
              {creating ? "Création…" : "Confirmer la création"}
            </button>
            <button
              type="button"
              onClick={() => setPreview(null)}
              disabled={creating}
              className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
            >
              Modifier
            </button>
          </>
        )}
      </div>
    </div>
  );
}
