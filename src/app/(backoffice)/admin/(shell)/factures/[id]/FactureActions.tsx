"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Boutons de la fiche facture : téléchargement du PDF et envoi au client en
// un clic. Le PDF est généré à la demande côté serveur.
export default function FactureActions({
  factureId,
  email,
  envoyeeLe,
}: {
  factureId: string;
  email: string | null;
  envoyeeLe: string | null;
}) {
  const router = useRouter();
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "erreur"; texte: string } | null>(null);

  async function envoyer() {
    if (!email) return;
    const dejaEnvoyee = envoyeeLe !== null;
    if (!confirm(`${dejaEnvoyee ? "Renvoyer" : "Envoyer"} la facture par e-mail à ${email} ?`)) return;

    setEnvoi(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/factures/${factureId}/envoyer`, { method: "POST" });
      const body = (await res.json().catch(() => null)) as { error?: string; to?: string } | null;
      if (!res.ok) {
        setMessage({ type: "erreur", texte: body?.error ?? "L'envoi a échoué." });
        return;
      }
      setMessage({ type: "ok", texte: `Facture envoyée à ${body?.to ?? email}.` });
      router.refresh();
    } catch {
      setMessage({ type: "erreur", texte: "Impossible de contacter le serveur." });
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={`/api/admin/factures/${factureId}/pdf`}
          className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
        >
          Télécharger le PDF
        </a>
        <button
          type="button"
          onClick={envoyer}
          disabled={envoi || !email}
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {envoi ? "Envoi en cours…" : envoyeeLe ? "Renvoyer par e-mail" : "Envoyer par e-mail"}
        </button>
        {envoyeeLe ? (
          <span className="text-xs text-stone-500">
            Dernier envoi le {new Date(envoyeeLe).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}
          </span>
        ) : null}
      </div>
      {!email ? (
        <p className="text-xs text-amber-700">
          Aucune adresse e-mail pour ce client : ajoutez-la sur sa fiche pour pouvoir envoyer la facture.
        </p>
      ) : null}
      {message ? (
        <p
          role={message.type === "erreur" ? "alert" : "status"}
          className={`rounded-md px-3 py-2 text-sm ${
            message.type === "ok"
              ? "border border-green-200 bg-green-50 text-green-700"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.texte}
        </p>
      ) : null}
    </div>
  );
}
