"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { visiteSchema } from "@/lib/validation/visiteSchema";
import { regleForfaitSchema } from "@/lib/validation/regleForfaitSchema";

type Niveau1State = {
  enabled: boolean;
  seuilAdultes: string;
  seuilEnfants: string;
  montant: string;
  actif: boolean;
};

type Niveau2State = {
  enabled: boolean;
  seuilGlobal: string;
  montant: string;
  actif: boolean;
};

export type VisiteFormInitialData = {
  nom: string;
  slug: string;
  description: string;
  imageBanniereUrl: string | null;
  visible: boolean;
  tarifAdulte: string;
  tarifEnfant: string;
  majorationTardiveMontant: string;
  majorationTardiveDelaiHeures: number;
  acomptePourcentage: string;
  acompteDelaiJours: number;
  reglesForfait: Array<{
    niveau: "NIVEAU_1" | "NIVEAU_2";
    seuilAdultes: number | null;
    seuilEnfants: number | null;
    seuilGlobal: number | null;
    montant: string;
    actif: boolean;
  }>;
};

function buildNiveau1(initial?: VisiteFormInitialData): Niveau1State {
  const r = initial?.reglesForfait.find((x) => x.niveau === "NIVEAU_1");
  return {
    enabled: !!r,
    seuilAdultes: r?.seuilAdultes != null ? String(r.seuilAdultes) : "",
    seuilEnfants: r?.seuilEnfants != null ? String(r.seuilEnfants) : "",
    montant: r ? String(r.montant) : "",
    actif: r?.actif ?? true,
  };
}

function buildNiveau2(initial?: VisiteFormInitialData): Niveau2State {
  const r = initial?.reglesForfait.find((x) => x.niveau === "NIVEAU_2");
  return {
    enabled: !!r,
    seuilGlobal: r?.seuilGlobal != null ? String(r.seuilGlobal) : "",
    montant: r ? String(r.montant) : "",
    actif: r?.actif ?? true,
  };
}

export default function VisiteForm({
  mode,
  visiteId,
  initialData,
}: {
  mode: "create" | "edit";
  visiteId?: string;
  initialData?: VisiteFormInitialData;
}) {
  const router = useRouter();

  const [nom, setNom] = useState(initialData?.nom ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [imageBanniereUrl, setImageBanniereUrl] = useState(initialData?.imageBanniereUrl ?? "");
  const [visible, setVisible] = useState(initialData?.visible ?? false);
  const [tarifAdulte, setTarifAdulte] = useState(initialData?.tarifAdulte ?? "");
  const [tarifEnfant, setTarifEnfant] = useState(initialData?.tarifEnfant ?? "");
  const [majorationTardiveMontant, setMajorationTardiveMontant] = useState(
    initialData?.majorationTardiveMontant ?? "0"
  );
  const [majorationTardiveDelaiHeures, setMajorationTardiveDelaiHeures] = useState(
    initialData ? String(initialData.majorationTardiveDelaiHeures) : "48"
  );
  const [acomptePourcentage, setAcomptePourcentage] = useState(
    initialData?.acomptePourcentage ?? "30"
  );
  const [acompteDelaiJours, setAcompteDelaiJours] = useState(
    initialData ? String(initialData.acompteDelaiJours) : "30"
  );

  const [niveau1, setNiveau1] = useState<Niveau1State>(() => buildNiveau1(initialData));
  const [niveau2, setNiveau2] = useState<Niveau2State>(() => buildNiveau2(initialData));

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErrors([]);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "visites");
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Échec de l'envoi de l'image.");
      setImageBanniereUrl(body.url);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Erreur inconnue."]);
    } finally {
      setUploading(false);
    }
  }

  function buildReglesForfaitPayload() {
    const regles: unknown[] = [];
    if (niveau1.enabled) {
      regles.push({
        niveau: "NIVEAU_1",
        seuilAdultes: Number(niveau1.seuilAdultes),
        seuilEnfants: Number(niveau1.seuilEnfants),
        montant: Number(niveau1.montant),
        actif: niveau1.actif,
      });
    }
    if (niveau2.enabled) {
      regles.push({
        niveau: "NIVEAU_2",
        seuilGlobal: Number(niveau2.seuilGlobal),
        montant: Number(niveau2.montant),
        actif: niveau2.actif,
      });
    }
    return regles;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    setFieldErrors({});

    const visitePayload = {
      nom,
      slug,
      description,
      imageBanniereUrl: imageBanniereUrl || undefined,
      visible,
      tarifAdulte: Number(tarifAdulte),
      tarifEnfant: Number(tarifEnfant),
      majorationTardiveMontant: Number(majorationTardiveMontant),
      majorationTardiveDelaiHeures: Number(majorationTardiveDelaiHeures),
      acomptePourcentage: Number(acomptePourcentage),
      acompteDelaiJours: Number(acompteDelaiJours),
    };

    const visiteParsed = visiteSchema.safeParse(visitePayload);
    if (!visiteParsed.success) {
      const flat = visiteParsed.error.flatten();
      setErrors(flat.formErrors);
      setFieldErrors(flat.fieldErrors as Record<string, string[]>);
      return;
    }

    const reglesForfaitPayload = buildReglesForfaitPayload();
    const reglesErrors: string[] = [];
    for (const regle of reglesForfaitPayload) {
      const parsed = regleForfaitSchema.safeParse(regle);
      if (!parsed.success) {
        reglesErrors.push(...parsed.error.flatten().formErrors);
        for (const msgs of Object.values(parsed.error.flatten().fieldErrors)) {
          if (msgs) reglesErrors.push(...msgs);
        }
      }
    }
    if (reglesErrors.length > 0) {
      setErrors(reglesErrors);
      return;
    }

    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/admin/visites" : `/api/admin/visites/${visiteId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visite: visiteParsed.data, reglesForfait: reglesForfaitPayload }),
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
      router.push("/admin/visites");
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
          <label className={labelClass} htmlFor="slug">Slug</label>
          <input id="slug" className={inputClass} value={slug} onChange={(e) => setSlug(e.target.value)} required />
          {fieldError("slug")}
        </div>

        <div className="space-y-1">
          <label className={labelClass} htmlFor="description">Description</label>
          <textarea
            id="description"
            className={inputClass}
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          {fieldError("description")}
        </div>

        <div className="space-y-1">
          <label className={labelClass} htmlFor="image">Image bannière</label>
          <input id="image" type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
          {uploading ? <p className="text-xs text-stone-500">Envoi en cours…</p> : null}
          {imageBanniereUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageBanniereUrl} alt="Aperçu bannière" className="mt-2 h-32 rounded-md object-cover" />
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <input
            id="visible"
            type="checkbox"
            checked={visible}
            onChange={(e) => setVisible(e.target.checked)}
          />
          <label className={labelClass} htmlFor="visible">Visible sur le site public</label>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-stone-900">Tarification</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className={labelClass} htmlFor="tarifAdulte">Tarif adulte (€)</label>
            <input
              id="tarifAdulte"
              type="number"
              step="0.01"
              min="0"
              className={inputClass}
              value={tarifAdulte}
              onChange={(e) => setTarifAdulte(e.target.value)}
              required
            />
            {fieldError("tarifAdulte")}
          </div>
          <div className="space-y-1">
            <label className={labelClass} htmlFor="tarifEnfant">Tarif enfant (€)</label>
            <input
              id="tarifEnfant"
              type="number"
              step="0.01"
              min="0"
              className={inputClass}
              value={tarifEnfant}
              onChange={(e) => setTarifEnfant(e.target.value)}
              required
            />
            {fieldError("tarifEnfant")}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className={labelClass} htmlFor="majMontant">Majoration tardive (€)</label>
            <input
              id="majMontant"
              type="number"
              step="0.01"
              min="0"
              className={inputClass}
              value={majorationTardiveMontant}
              onChange={(e) => setMajorationTardiveMontant(e.target.value)}
              required
            />
            {fieldError("majorationTardiveMontant")}
          </div>
          <div className="space-y-1">
            <label className={labelClass} htmlFor="majDelai">Délai majoration (heures)</label>
            <input
              id="majDelai"
              type="number"
              step="1"
              min="0"
              className={inputClass}
              value={majorationTardiveDelaiHeures}
              onChange={(e) => setMajorationTardiveDelaiHeures(e.target.value)}
              required
            />
            {fieldError("majorationTardiveDelaiHeures")}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className={labelClass} htmlFor="acomptePct">Acompte (%)</label>
            <input
              id="acomptePct"
              type="number"
              step="0.01"
              min="0"
              max="100"
              className={inputClass}
              value={acomptePourcentage}
              onChange={(e) => setAcomptePourcentage(e.target.value)}
              required
            />
            {fieldError("acomptePourcentage")}
          </div>
          <div className="space-y-1">
            <label className={labelClass} htmlFor="acompteDelai">Délai acompte (jours)</label>
            <input
              id="acompteDelai"
              type="number"
              step="1"
              min="0"
              className={inputClass}
              value={acompteDelaiJours}
              onChange={(e) => setAcompteDelaiJours(e.target.value)}
              required
            />
            {fieldError("acompteDelaiJours")}
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-stone-900">Forfaits</h2>

        <div className="space-y-3 rounded-md border border-stone-200 p-4">
          <div className="flex items-center gap-2">
            <input
              id="n1enabled"
              type="checkbox"
              checked={niveau1.enabled}
              onChange={(e) => setNiveau1((s) => ({ ...s, enabled: e.target.checked }))}
            />
            <label className={labelClass} htmlFor="n1enabled">Activer le forfait niveau 1</label>
          </div>
          {niveau1.enabled ? (
            <div className="space-y-3 pl-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={labelClass}>Seuil adultes</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className={inputClass}
                    value={niveau1.seuilAdultes}
                    onChange={(e) => setNiveau1((s) => ({ ...s, seuilAdultes: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Seuil enfants</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className={inputClass}
                    value={niveau1.seuilEnfants}
                    onChange={(e) => setNiveau1((s) => ({ ...s, seuilEnfants: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Montant du forfait (€)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className={inputClass}
                  value={niveau1.montant}
                  onChange={(e) => setNiveau1((s) => ({ ...s, montant: e.target.value }))}
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={niveau1.actif}
                  onChange={(e) => setNiveau1((s) => ({ ...s, actif: e.target.checked }))}
                />
                <label className="text-sm text-stone-700">Actif</label>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-3 rounded-md border border-stone-200 p-4">
          <div className="flex items-center gap-2">
            <input
              id="n2enabled"
              type="checkbox"
              checked={niveau2.enabled}
              onChange={(e) => setNiveau2((s) => ({ ...s, enabled: e.target.checked }))}
            />
            <label className={labelClass} htmlFor="n2enabled">Activer le forfait niveau 2</label>
          </div>
          {niveau2.enabled ? (
            <div className="space-y-3 pl-6">
              <div className="space-y-1">
                <label className={labelClass}>Seuil global (total personnes)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className={inputClass}
                  value={niveau2.seuilGlobal}
                  onChange={(e) => setNiveau2((s) => ({ ...s, seuilGlobal: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Montant du forfait (€)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className={inputClass}
                  value={niveau2.montant}
                  onChange={(e) => setNiveau2((s) => ({ ...s, montant: e.target.value }))}
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={niveau2.actif}
                  onChange={(e) => setNiveau2((s) => ({ ...s, actif: e.target.checked }))}
                />
                <label className="text-sm text-stone-700">Actif</label>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting || uploading}
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {submitting ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
