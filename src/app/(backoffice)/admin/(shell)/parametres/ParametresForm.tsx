"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type SiteSettingsInitial = {
  siteName: string | null;
  headerImageUrl: string | null;
  backgroundImageUrl: string | null;
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

export default function ParametresForm({ initial }: { initial: SiteSettingsInitial }) {
  const router = useRouter();

  const [siteName, setSiteName] = useState(initial.siteName ?? "");
  const [headerImageUrl, setHeaderImageUrl] = useState(initial.headerImageUrl ?? "");
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(initial.backgroundImageUrl ?? "");

  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  async function handleHeaderUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHeader(true);
    setErrors([]);
    try {
      setHeaderImageUrl(await uploadImage(file));
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Erreur inconnue."]);
    } finally {
      setUploadingHeader(false);
    }
  }

  async function handleBackgroundUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBackground(true);
    setErrors([]);
    try {
      setBackgroundImageUrl(await uploadImage(file));
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Erreur inconnue."]);
    } finally {
      setUploadingBackground(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    setSuccess(false);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/parametres", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName: siteName || null,
          headerImageUrl: headerImageUrl || null,
          backgroundImageUrl: backgroundImageUrl || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        const flat = body?.error;
        const msgs = [...(flat?.formErrors ?? [])];
        for (const fieldMsgs of Object.values(flat?.fieldErrors ?? {})) {
          if (Array.isArray(fieldMsgs)) msgs.push(...fieldMsgs);
        }
        throw new Error(msgs[0] ?? "Échec de l'enregistrement.");
      }
      setSuccess(true);
      router.refresh();
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Erreur inconnue."]);
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none";
  const labelClass = "text-sm font-medium text-stone-700";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {errors.length > 0 ? (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          <ul className="list-inside list-disc">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {success ? (
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
          Paramètres enregistrés.
        </div>
      ) : null}

      <section className="space-y-4 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <div className="space-y-1">
          <label className={labelClass} htmlFor="siteName">Nom du site</label>
          <input
            id="siteName"
            className={inputClass}
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className={labelClass} htmlFor="header">Image d&apos;en-tête</label>
          <input id="header" type="file" accept="image/*" onChange={handleHeaderUpload} disabled={uploadingHeader} />
          {uploadingHeader ? <p className="text-xs text-stone-500">Envoi en cours…</p> : null}
          {headerImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={headerImageUrl} alt="Aperçu en-tête" className="mt-2 h-24 rounded-md object-cover" />
          ) : null}
        </div>

        <div className="space-y-1">
          <label className={labelClass} htmlFor="background">Image de fond</label>
          <input
            id="background"
            type="file"
            accept="image/*"
            onChange={handleBackgroundUpload}
            disabled={uploadingBackground}
          />
          {uploadingBackground ? <p className="text-xs text-stone-500">Envoi en cours…</p> : null}
          {backgroundImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={backgroundImageUrl} alt="Aperçu fond" className="mt-2 h-24 rounded-md object-cover" />
          ) : null}
        </div>
      </section>

      <button
        type="submit"
        disabled={saving || uploadingHeader || uploadingBackground}
        className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
      >
        {saving ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
