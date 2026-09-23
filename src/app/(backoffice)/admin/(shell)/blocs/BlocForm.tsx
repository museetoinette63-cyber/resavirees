"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { blocContenuSchema } from "@/lib/validation/blocContenuSchema";

export type BlocFormInitialData = {
  type: "TEXTE" | "TEXTE_IMAGE" | "ENCART";
  emplacement: "ACCUEIL" | "SITE_ENTIER";
  titre: string | null;
  contenu: string;
  imageUrl: string | null;
  ordre: number;
  actif: boolean;
};

const TYPE_LABELS: Record<BlocFormInitialData["type"], string> = {
  TEXTE: "Texte (titre + paragraphe)",
  TEXTE_IMAGE: "Texte + image",
  ENCART: "Encart (mise en avant / annonce)",
};

const EMPLACEMENT_LABELS: Record<BlocFormInitialData["emplacement"], string> = {
  ACCUEIL: "Page d'accueil uniquement",
  SITE_ENTIER: "Toutes les pages du site",
};

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "site");
  const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error ?? "Échec de l'envoi de l'image.");
  return body.url as string;
}

export default function BlocForm({
  mode,
  blocId,
  initialData,
}: {
  mode: "create" | "edit";
  blocId?: string;
  initialData?: BlocFormInitialData;
}) {
  const router = useRouter();

  const [type, setType] = useState<BlocFormInitialData["type"]>(initialData?.type ?? "TEXTE");
  const [emplacement, setEmplacement] = useState<BlocFormInitialData["emplacement"]>(
    initialData?.emplacement ?? "ACCUEIL"
  );
  const [titre, setTitre] = useState(initialData?.titre ?? "");
  const [contenu, setContenu] = useState(initialData?.contenu ?? "");
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl ?? "");
  const [ordre, setOrdre] = useState(String(initialData?.ordre ?? 0));
  const [actif, setActif] = useState(initialData?.actif ?? true);

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
      setImageUrl(await uploadImage(file));
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Erreur inconnue."]);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    setFieldErrors({});

    const payload = {
      type,
      emplacement,
      titre: titre.trim() ? titre : null,
      contenu,
      imageUrl: imageUrl.trim() ? imageUrl : null,
      ordre: Number(ordre),
      actif,
    };

    const parsed = blocContenuSchema.safeParse(payload);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      setErrors(flat.formErrors);
      setFieldErrors(flat.fieldErrors as Record<string, string[]>);
      return;
    }

    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/admin/blocs" : `/api/admin/blocs/${blocId}`;
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
        router.push(`/admin/blocs/${body.bloc.id}`);
      } else {
        router.push("/admin/blocs");
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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className={labelClass} htmlFor="type">Type de bloc</label>
            <select
              id="type"
              className={inputClass}
              value={type}
              onChange={(e) => setType(e.target.value as BlocFormInitialData["type"])}
            >
              {(Object.keys(TYPE_LABELS) as BlocFormInitialData["type"][]).map((key) => (
                <option key={key} value={key}>
                  {TYPE_LABELS[key]}
                </option>
              ))}
            </select>
            {fieldError("type")}
          </div>
          <div className="space-y-1">
            <label className={labelClass} htmlFor="emplacement">Emplacement</label>
            <select
              id="emplacement"
              className={inputClass}
              value={emplacement}
              onChange={(e) => setEmplacement(e.target.value as BlocFormInitialData["emplacement"])}
            >
              {(Object.keys(EMPLACEMENT_LABELS) as BlocFormInitialData["emplacement"][]).map((key) => (
                <option key={key} value={key}>
                  {EMPLACEMENT_LABELS[key]}
                </option>
              ))}
            </select>
            {fieldError("emplacement")}
          </div>
        </div>

        <div className="space-y-1">
          <label className={labelClass} htmlFor="titre">Titre</label>
          <input
            id="titre"
            className={inputClass}
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Optionnel"
          />
          {fieldError("titre")}
        </div>

        <div className="space-y-1">
          <label className={labelClass} htmlFor="contenu">Contenu</label>
          <textarea
            id="contenu"
            className={inputClass}
            rows={6}
            value={contenu}
            onChange={(e) => setContenu(e.target.value)}
            placeholder="Les sauts de ligne sont conservés à l'affichage."
            required
          />
          {fieldError("contenu")}
        </div>

        {type === "TEXTE_IMAGE" ? (
          <div className="space-y-1">
            <label className={labelClass} htmlFor="image">Image</label>
            <input id="image" type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
            {uploading ? <p className="text-xs text-stone-500">Envoi en cours…</p> : null}
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="Aperçu" className="mt-2 h-24 rounded-md object-cover" />
            ) : null}
            {fieldError("imageUrl")}
          </div>
        ) : null}

        <div className="space-y-1">
          <label className={labelClass} htmlFor="ordre">Ordre d&apos;affichage</label>
          <input
            id="ordre"
            type="number"
            step="1"
            className={inputClass}
            value={ordre}
            onChange={(e) => setOrdre(e.target.value)}
          />
          <p className="text-xs text-stone-500">Les blocs s&apos;affichent du plus petit au plus grand.</p>
          {fieldError("ordre")}
        </div>

        <div className="flex items-center gap-2">
          <input
            id="actif"
            type="checkbox"
            checked={actif}
            onChange={(e) => setActif(e.target.checked)}
          />
          <label className={labelClass} htmlFor="actif">Actif (visible sur le site public)</label>
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
