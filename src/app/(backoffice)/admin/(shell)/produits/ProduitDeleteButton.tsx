"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Shared delete-with-confirm button used on both the produits list (stays
// on the page, just refreshes) and the produit edit page (navigates back to
// the list on success via `redirectTo`). A 409 (produit referenced by an
// existing DevisLigne/FactureLigne — see src/app/api/admin/produits/[id]/route.ts)
// permanently greys the button out for this render, since retrying without
// first clearing those references would only fail again.
export default function ProduitDeleteButton({
  produitId,
  redirectTo,
}: {
  produitId: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  async function remove() {
    if (!confirm("Supprimer définitivement ce produit ?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/produits/${produitId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        if (res.status === 409) setBlocked(true);
        throw new Error(body?.error?.formErrors?.[0] ?? "Échec de la suppression.");
      }
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={loading || blocked}
        onClick={remove}
        className="text-red-600 underline hover:text-red-800 disabled:opacity-50 disabled:no-underline"
      >
        {loading ? "Suppression…" : "Supprimer"}
      </button>
      {error ? <p className="max-w-[240px] text-right text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
