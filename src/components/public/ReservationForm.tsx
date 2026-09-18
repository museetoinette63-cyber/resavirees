"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { reservationSchema } from "@/lib/validation/reservationSchema";

interface ReservationFormProps {
  creneauId: string;
}

interface FormState {
  nomOuRaisonSociale: string;
  telephone: string;
  email: string;
  adressePostale: string;
  nbAdultes: string;
  nbEnfants: string;
}

const ETAT_INITIAL: FormState = {
  nomOuRaisonSociale: "",
  telephone: "",
  email: "",
  adressePostale: "",
  nbAdultes: "1",
  nbEnfants: "0",
};

/**
 * Formulaire de réservation publique. Validation client via le même schéma
 * Zod que l'API (`reservationSchema`), puis POST /api/reservations. Sur
 * succès, redirige vers la page de confirmation ; sur erreur (ex. créneau
 * plus disponible, réservé entre-temps par quelqu'un d'autre), affiche le
 * message inline sans faire planter la page.
 */
export default function ReservationForm({ creneauId }: ReservationFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(ETAT_INITIAL);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleChange<K extends keyof FormState>(field: K, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const payload = {
      nomOuRaisonSociale: form.nomOuRaisonSociale,
      telephone: form.telephone,
      email: form.email,
      adressePostale: form.adressePostale,
      nbAdultes: Number(form.nbAdultes),
      nbEnfants: Number(form.nbEnfants),
    };

    const parsed = reservationSchema.safeParse(payload);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !errors[key]) {
          errors[key] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creneauId, ...parsed.data }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setFormError(body?.error ?? "Une erreur est survenue. Merci de réessayer.");
        setSubmitting(false);
        return;
      }

      const body = (await response.json()) as { reservationId: string };
      router.push(`/reservation/confirmation/${body.reservationId}`);
    } catch {
      setFormError("Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-stone-200 bg-white p-6 shadow-sm"
    >
      {formError ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
      ) : null}

      <div className="space-y-1">
        <label htmlFor="nomOuRaisonSociale" className="text-sm font-medium text-stone-700">
          Nom ou raison sociale
        </label>
        <input
          id="nomOuRaisonSociale"
          value={form.nomOuRaisonSociale}
          onChange={(e) => handleChange("nomOuRaisonSociale", e.target.value)}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
        />
        {fieldErrors.nomOuRaisonSociale ? (
          <p className="text-xs text-red-600">{fieldErrors.nomOuRaisonSociale}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="telephone" className="text-sm font-medium text-stone-700">
          Téléphone
        </label>
        <input
          id="telephone"
          type="tel"
          value={form.telephone}
          onChange={(e) => handleChange("telephone", e.target.value)}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
        />
        {fieldErrors.telephone ? <p className="text-xs text-red-600">{fieldErrors.telephone}</p> : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium text-stone-700">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => handleChange("email", e.target.value)}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
        />
        {fieldErrors.email ? <p className="text-xs text-red-600">{fieldErrors.email}</p> : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="adressePostale" className="text-sm font-medium text-stone-700">
          Adresse postale
        </label>
        <textarea
          id="adressePostale"
          value={form.adressePostale}
          onChange={(e) => handleChange("adressePostale", e.target.value)}
          rows={2}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
        />
        {fieldErrors.adressePostale ? (
          <p className="text-xs text-red-600">{fieldErrors.adressePostale}</p>
        ) : null}
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
            value={form.nbAdultes}
            onChange={(e) => handleChange("nbAdultes", e.target.value)}
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
            value={form.nbEnfants}
            onChange={(e) => handleChange("nbEnfants", e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
          />
        </div>
      </div>
      {fieldErrors.nbAdultes ? <p className="text-xs text-red-600">{fieldErrors.nbAdultes}</p> : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Envoi en cours…" : "Confirmer la réservation"}
      </button>
    </form>
  );
}
