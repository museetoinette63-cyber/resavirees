"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Shared delete-with-confirm button used on both the blocs list (stays on
// the page, just refreshes) and the bloc edit page (navigates back to the
// list on success via `redirectTo`). Mirrors ProduitDeleteButton, minus the
// "blocked" 409 case: a BlocContenu has no other model referencing it, so a
// delete can only fail on a transient/unexpected error.
export default function BlocDeleteButton({
  blocId,
  redirectTo,
}: {
  blocId: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!confirm("Supprimer définitivement ce bloc ?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/blocs/${blocId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
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
        disabled={loading}
        onClick={remove}
        className="text-red-600 underline hover:text-red-800 disabled:opacity-50 disabled:no-underline"
      >
        {loading ? "Suppression…" : "Supprimer"}
      </button>
      {error ? <p className="max-w-[240px] text-right text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
