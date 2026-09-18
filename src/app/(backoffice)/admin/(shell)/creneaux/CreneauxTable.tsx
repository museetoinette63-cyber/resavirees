"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type CreneauRow = {
  id: string;
  visiteNom: string;
  dateLabel: string; // grouping key, e.g. "vendredi 3 octobre 2026"
  heureLabel: string; // "14:00"
  status: "PUBLIE" | "RESERVE" | "MASQUE";
};

const STATUS_LABEL: Record<CreneauRow["status"], string> = {
  PUBLIE: "Publié",
  RESERVE: "Réservé",
  MASQUE: "Masqué",
};

const STATUS_CLASS: Record<CreneauRow["status"], string> = {
  PUBLIE: "bg-green-100 text-green-700",
  RESERVE: "bg-amber-100 text-amber-700",
  MASQUE: "bg-stone-100 text-stone-500",
};

export default function CreneauxTable({ rows }: { rows: CreneauRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, CreneauRow[]>();
    for (const row of rows) {
      const list = map.get(row.dateLabel) ?? [];
      list.push(row);
      map.set(row.dateLabel, list);
    }
    return Array.from(map.entries());
  }, [rows]);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function toggleStatus(row: CreneauRow) {
    setBusy(true);
    setError(null);
    try {
      const nextStatus = row.status === "PUBLIE" ? "MASQUE" : "PUBLIE";
      const res = await fetch(`/api/admin/creneaux/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.formErrors?.[0] ?? "Échec de la mise à jour.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteOne(row: CreneauRow) {
    if (row.status === "RESERVE") return;
    if (!confirm("Supprimer ce créneau ?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/creneaux/${row.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.formErrors?.[0] ?? "Échec de la suppression.");
      }
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setBusy(false);
    }
  }

  async function bulkAction(action: "masquer" | "supprimer") {
    if (selected.size === 0) return;
    if (action === "supprimer" && !confirm(`Supprimer ${selected.size} créneau(x) ?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/creneaux/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error?.formErrors?.[0] ?? "Échec de l'action groupée.");
      }
      if (body.skipped?.length > 0) {
        setError(
          `${body.skipped.length} créneau(x) réservé(s) n'ont pas été modifié(s) (une réservation active y est liée).`
        );
      }
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      {selected.size > 0 ? (
        <div className="flex items-center gap-3 rounded-md border border-stone-300 bg-stone-100 px-4 py-2 text-sm">
          <span>{selected.size} sélectionné(s)</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => bulkAction("masquer")}
            className="rounded-md border border-stone-400 px-3 py-1 hover:bg-white disabled:opacity-50"
          >
            Masquer
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => bulkAction("supprimer")}
            className="rounded-md border border-red-400 px-3 py-1 text-red-700 hover:bg-white disabled:opacity-50"
          >
            Supprimer
          </button>
        </div>
      ) : null}

      {grouped.length === 0 ? (
        <div className="rounded-lg border border-stone-200 bg-white p-8 text-center text-stone-400 shadow-sm">
          Aucun créneau pour ces filtres.
        </div>
      ) : (
        grouped.map(([dateLabel, dateRows]) => (
          <div key={dateLabel} className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-200 bg-stone-50 px-4 py-2 text-sm font-medium capitalize text-stone-700">
              {dateLabel}
            </div>
            <table className="min-w-full divide-y divide-stone-100 text-sm">
              <tbody className="divide-y divide-stone-100">
                {dateRows.map((row) => (
                  <tr key={row.id}>
                    <td className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleSelected(row.id)}
                      />
                    </td>
                    <td className="px-4 py-3 text-stone-700">{row.heureLabel}</td>
                    <td className="px-4 py-3 text-stone-900">{row.visiteNom}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[row.status]}`}
                      >
                        {STATUS_LABEL[row.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        {row.status !== "RESERVE" ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => toggleStatus(row)}
                            className="text-stone-600 underline hover:text-stone-900 disabled:opacity-50"
                          >
                            {row.status === "PUBLIE" ? "Masquer" : "Republier"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={busy || row.status === "RESERVE"}
                          title={
                            row.status === "RESERVE"
                              ? "Ce créneau est lié à une réservation active et ne peut pas être supprimé."
                              : undefined
                          }
                          onClick={() => deleteOne(row)}
                          className="text-red-600 underline hover:text-red-800 disabled:cursor-not-allowed disabled:text-stone-300 disabled:no-underline"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}
