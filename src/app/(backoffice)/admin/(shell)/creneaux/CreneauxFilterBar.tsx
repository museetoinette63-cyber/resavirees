"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function CreneauxFilterBar({
  visites,
}: {
  visites: { id: string; nom: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/admin/creneaux?${params.toString()}`);
  }

  const selectClass =
    "rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        className={selectClass}
        value={searchParams.get("visiteId") ?? ""}
        onChange={(e) => updateParam("visiteId", e.target.value)}
      >
        <option value="">Toutes les visites</option>
        {visites.map((v) => (
          <option key={v.id} value={v.id}>
            {v.nom}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={searchParams.get("status") ?? ""}
        onChange={(e) => updateParam("status", e.target.value)}
      >
        <option value="">Tous les statuts</option>
        <option value="PUBLIE">Publié</option>
        <option value="RESERVE">Réservé</option>
        <option value="MASQUE">Masqué</option>
      </select>
    </div>
  );
}
