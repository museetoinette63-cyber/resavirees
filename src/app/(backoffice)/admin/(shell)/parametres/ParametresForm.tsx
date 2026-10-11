"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadImage as envoyerImage } from "@/lib/uploadImage";

export type SiteSettingsInitial = {
  siteName: string | null;
  headerImageUrl: string | null;
  backgroundImageUrl: string | null;
  raisonSociale: string | null;
  siret: string | null;
  adresseSiege: string | null;
  emailContact: string | null;
  telephoneContact: string | null;
  cgvTexte: string | null;
  sonAmbianceUrl: string | null;
  sonAmbianceNom: string | null;
  logoUrl: string | null;
  logosDocuments: string[];
};

function uploadImage(file: File): Promise<string> {
  return envoyerImage(file, "site");
}

async function uploadAudio(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "audio");
  const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error ?? "Échec de l'envoi du fichier audio.");
  return body.url as string;
}

export default function ParametresForm({ initial }: { initial: SiteSettingsInitial }) {
  const router = useRouter();

  const [siteName, setSiteName] = useState(initial.siteName ?? "");
  const [headerImageUrl, setHeaderImageUrl] = useState(initial.headerImageUrl ?? "");
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(initial.backgroundImageUrl ?? "");

  const [raisonSociale, setRaisonSociale] = useState(initial.raisonSociale ?? "");
  const [siret, setSiret] = useState(initial.siret ?? "");
  const [adresseSiege, setAdresseSiege] = useState(initial.adresseSiege ?? "");
  const [emailContact, setEmailContact] = useState(initial.emailContact ?? "");
  const [telephoneContact, setTelephoneContact] = useState(initial.telephoneContact ?? "");
  const [cgvTexte, setCgvTexte] = useState(initial.cgvTexte ?? "");
  const [sonAmbianceUrl, setSonAmbianceUrl] = useState(initial.sonAmbianceUrl ?? "");
  const [sonAmbianceNom, setSonAmbianceNom] = useState(initial.sonAmbianceNom ?? "");
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl ?? "");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logosDocuments, setLogosDocuments] = useState<string[]>(initial.logosDocuments);
  const [uploadingLogosDocs, setUploadingLogosDocs] = useState(false);

  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [uploadingSon, setUploadingSon] = useState(false);
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

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setErrors([]);
    try {
      setLogoUrl(await envoyerImage(file, "site", { logo: true }));
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Erreur inconnue."]);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleLogosDocumentsUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fichiers = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (fichiers.length === 0) return;
    if (logosDocuments.length + fichiers.length > 6) {
      setErrors(["6 logos maximum sur les documents."]);
      return;
    }
    setUploadingLogosDocs(true);
    setErrors([]);
    try {
      const urls: string[] = [];
      for (const fichier of fichiers) {
        urls.push(await envoyerImage(fichier, "site", { logo: true }));
      }
      setLogosDocuments((actuels) => [...actuels, ...urls]);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Erreur inconnue."]);
    } finally {
      setUploadingLogosDocs(false);
    }
  }

  function deplacerLogoDocument(index: number, sens: -1 | 1) {
    setLogosDocuments((actuels) => {
      const cible = index + sens;
      if (cible < 0 || cible >= actuels.length) return actuels;
      const copie = [...actuels];
      [copie[index], copie[cible]] = [copie[cible], copie[index]];
      return copie;
    });
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

  async function handleSonUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSon(true);
    setErrors([]);
    try {
      setSonAmbianceUrl(await uploadAudio(file));
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Erreur inconnue."]);
    } finally {
      setUploadingSon(false);
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
          raisonSociale: raisonSociale || null,
          siret: siret || null,
          adresseSiege: adresseSiege || null,
          emailContact: emailContact || null,
          telephoneContact: telephoneContact || null,
          cgvTexte: cgvTexte || null,
          sonAmbianceUrl: sonAmbianceUrl || null,
          sonAmbianceNom: sonAmbianceNom || null,
          logoUrl: logoUrl || null,
          logosDocuments,
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
          <label className={labelClass} htmlFor="logo">Logo des e-mails</label>
          <p className="text-xs text-stone-500">
            Affiché en haut de chaque e-mail envoyé aux clients (confirmation, devis, facture). Image PNG
            ou JPG, réduite automatiquement.
          </p>
          <input
            id="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleLogoUpload}
            disabled={uploadingLogo}
          />
          {uploadingLogo ? <p className="text-xs text-stone-500">Envoi en cours…</p> : null}
          {logoUrl ? (
            <div className="mt-2 space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt="Aperçu du logo"
                className="max-h-24 rounded-md border border-stone-200 bg-white p-2 object-contain"
              />
              <button
                type="button"
                onClick={() => setLogoUrl("")}
                className="text-xs text-red-600 underline hover:text-red-800"
              >
                Retirer le logo
              </button>
            </div>
          ) : null}
        </div>

        <div className="space-y-1">
          <label className={labelClass} htmlFor="logosDocuments">Logos des devis et factures</label>
          <p className="text-xs text-stone-500">
            Imprimés en haut de chaque PDF de devis et de facture, dans l&apos;ordre ci-dessous (6 maximum).
            Images PNG ou JPG, réduites automatiquement.
          </p>
          <input
            id="logosDocuments"
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            onChange={handleLogosDocumentsUpload}
            disabled={uploadingLogosDocs || logosDocuments.length >= 6}
          />
          {uploadingLogosDocs ? <p className="text-xs text-stone-500">Envoi en cours…</p> : null}
          {logosDocuments.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-3">
              {logosDocuments.map((url, i) => (
                <li key={url} className="space-y-1 rounded-md border border-stone-200 bg-white p-2 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Logo ${i + 1}`} className="mx-auto h-16 max-w-[8rem] object-contain" />
                  <div className="flex justify-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => deplacerLogoDocument(i, -1)}
                      disabled={i === 0}
                      className="text-stone-600 underline disabled:opacity-30"
                      aria-label="Déplacer vers la gauche"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => deplacerLogoDocument(i, 1)}
                      disabled={i === logosDocuments.length - 1}
                      className="text-stone-600 underline disabled:opacity-30"
                      aria-label="Déplacer vers la droite"
                    >
                      →
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogosDocuments((actuels) => actuels.filter((_, j) => j !== i))}
                      className="text-red-600 underline hover:text-red-800"
                    >
                      Retirer
                    </button>
                  </div>
                </li>
              ))}
            </ul>
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

      <section className="space-y-4 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">
            Identité légale (expéditeur des devis/factures)
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            Ces informations apparaissent comme émetteur sur chaque devis et facture PDF.
          </p>
        </div>

        <div className="space-y-1">
          <label className={labelClass} htmlFor="raisonSociale">Raison sociale</label>
          <input
            id="raisonSociale"
            className={inputClass}
            value={raisonSociale}
            onChange={(e) => setRaisonSociale(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className={labelClass} htmlFor="siret">SIRET</label>
          <input
            id="siret"
            className={inputClass}
            value={siret}
            onChange={(e) => setSiret(e.target.value)}
            placeholder="14 chiffres"
          />
        </div>

        <div className="space-y-1">
          <label className={labelClass} htmlFor="adresseSiege">Adresse du siège</label>
          <textarea
            id="adresseSiege"
            className={inputClass}
            rows={3}
            value={adresseSiege}
            onChange={(e) => setAdresseSiege(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className={labelClass} htmlFor="emailContact">Email de contact</label>
            <input
              id="emailContact"
              type="email"
              className={inputClass}
              value={emailContact}
              onChange={(e) => setEmailContact(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className={labelClass} htmlFor="telephoneContact">Téléphone de contact</label>
            <input
              id="telephoneContact"
              type="tel"
              className={inputClass}
              value={telephoneContact}
              onChange={(e) => setTelephoneContact(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">Conditions générales de vente</h2>
          <p className="mt-1 text-xs text-stone-500">
            Texte brut : les sauts de ligne sont conservés et mis en forme automatiquement sur le PDF.
          </p>
        </div>

        <div className="space-y-1">
          <label className={labelClass} htmlFor="cgvTexte">Texte des CGV</label>
          <textarea
            id="cgvTexte"
            className={`${inputClass} font-mono`}
            rows={10}
            value={cgvTexte}
            onChange={(e) => setCgvTexte(e.target.value)}
          />
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">Ambiance sonore</h2>
          <p className="mt-1 text-xs text-stone-500">
            Fichier audio (mp3, ogg ou wav, 15 Mo max) joué en boucle sur le site public. Les
            visiteurs doivent cliquer sur le bouton dédié pour l&apos;activer : aucune lecture
            automatique.
          </p>
        </div>

        <div className="space-y-1">
          <label className={labelClass} htmlFor="sonAmbiance">Fichier audio</label>
          <input
            id="sonAmbiance"
            type="file"
            accept="audio/mpeg,audio/ogg,audio/wav,audio/x-wav"
            onChange={handleSonUpload}
            disabled={uploadingSon}
          />
          {uploadingSon ? <p className="text-xs text-stone-500">Envoi en cours…</p> : null}
          {sonAmbianceUrl ? (
            <audio controls src={sonAmbianceUrl} className="mt-2 w-full max-w-sm" />
          ) : null}
        </div>

        <div className="space-y-1">
          <label className={labelClass} htmlFor="sonAmbianceNom">Nom affiché</label>
          <input
            id="sonAmbianceNom"
            className={inputClass}
            value={sonAmbianceNom}
            onChange={(e) => setSonAmbianceNom(e.target.value)}
            placeholder="Ex. Horloge comtoise, Feu de cheminée…"
          />
        </div>
      </section>

      {errors.length > 0 ? (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-medium">Les paramètres n&apos;ont pas été enregistrés :</p>
          <ul className="mt-1 list-inside list-disc">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {success ? (
        <p role="status" className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          ✓ Paramètres enregistrés.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={saving || uploadingHeader || uploadingBackground || uploadingSon || uploadingLogo || uploadingLogosDocs}
        className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
      >
        {saving ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
