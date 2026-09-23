"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { photoCarrouselSchema } from "@/lib/validation/photoCarrouselSchema";

export type CarrouselFormInitialData = {
  url: string;
  legende: string | null;
  ordre: number;
  actif: boolean;
};

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "carrousel");
  const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error ?? "Échec de l'envoi de l'image.");
  return body.url as string;
}

export default function CarrouselForm({
  mode,
  photoId,
  initialData,
}: {
  mode: "create" | "edit";
  photoId?: string;
  initialData?: CarrouselFormInitialData;
}) {
  const router = useRouter();

  const [url, setUrl] = useState(initialData?.url ?? "");
  const [legende, setLegende] = useState(initialData?.legende ?? "");
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
      setUrl(await uploadImage(file));
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
      url,
      legende: legende.trim() ? legende : null,
      ordre: Number(ordre),
      actif,
    };

    const parsed = photoCarrouselSchema.safeParse(payload);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      setErrors(flat.formErrors);
      setFieldErrors(flat.fieldErrors as Record<string, string[]>);
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = mode === "create" ? "/api/admin/carrousel" : `/api/admin/carrousel/${photoId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(endpoint, {
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
        router.push(`/admin/carrousel/${body.photo.id}`);
      } else {
        router.push("/admin/carrousel");
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
        <h2 className="text-sm font-semibold text-stone-900">Photo</h2>

        <div className="space-y-1">
          <label className={labelClass} htmlFor="image">Image</label>
          <input id="image" type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
          {uploading ? <p className="text-xs text-stone-500">Envoi en cours…</p> : null}
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Aperçu" className="mt-2 h-24 rounded-md object-cover" />
          ) : null}
          {fieldError("url")}
        </div>

        <div className="space-y-1">
          <label className={labelClass} htmlFor="legende">Légende</label>
          <input
            id="legende"
            className={inputClass}
            value={legende}
            onChange={(e) => setLegende(e.target.value)}
            placeholder="Optionnelle"
          />
          {fieldError("legende")}
        </div>

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
          <p className="text-xs text-stone-500">Les photos défilent du plus petit ordre au plus grand.</p>
          {fieldError("ordre")}
        </div>

        <div className="flex items-center gap-2">
          <input
            id="actif"
            type="checkbox"
            checked={actif}
            onChange={(e) => setActif(e.target.checked)}
          />
          <label className={labelClass} htmlFor="actif">Actif (visible dans le diaporama)</label>
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
