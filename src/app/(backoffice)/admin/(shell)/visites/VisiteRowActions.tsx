"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type RegleForfaitApi = {
  niveau: "NIVEAU_1" | "NIVEAU_2";
  seuilAdultes: number | null;
  seuilEnfants: number | null;
  seuilGlobal: number | null;
  montant: string;
  actif: boolean;
};

type VisiteApi = {
  nom: string;
  slug: string;
  description: string;
  imageBanniereUrl: string | null;
  visible: boolean;
  tarifAdulte: string;
  tarifEnfant: string;
  majorationTardiveMontant: string;
  majorationTardiveDelaiHeures: number;
  acomptePourcentage: string;
  acompteDelaiJours: number;
  reglesForfait: RegleForfaitApi[];
};

// Client-side row actions for the visites list: edit link, visibility
// toggle, delete-with-confirm. Kept as its own small client component so
// the parent visites/page.tsx list itself stays a server component.
export default function VisiteRowActions({
  visiteId,
  visible,
}: {
  visiteId: string;
  visible: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleVisible() {
    setLoading(true);
    setError(null);
    try {
      const currentRes = await fetch(`/api/admin/visites/${visiteId}`);
      if (!currentRes.ok) throw new Error("Impossible de charger la visite.");
      const { visite: v }: { visite: VisiteApi } = await currentRes.json();

      const res = await fetch(`/api/admin/visites/${visiteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visite: {
            nom: v.nom,
            slug: v.slug,
            description: v.description,
            imageBanniereUrl: v.imageBanniereUrl ?? undefined,
            visible: !v.visible,
            tarifAdulte: Number(v.tarifAdulte),
            tarifEnfant: Number(v.tarifEnfant),
            majorationTardiveMontant: Number(v.majorationTardiveMontant),
            majorationTardiveDelaiHeures: v.majorationTardiveDelaiHeures,
            acomptePourcentage: Number(v.acomptePourcentage),
            acompteDelaiJours: v.acompteDelaiJours,
          },
          reglesForfait: v.reglesForfait.map((r) =>
            r.niveau === "NIVEAU_1"
              ? {
                  niveau: "NIVEAU_1" as const,
                  seuilAdultes: r.seuilAdultes,
                  seuilEnfants: r.seuilEnfants,
                  montant: Number(r.montant),
                  actif: r.actif,
                }
              : {
                  niveau: "NIVEAU_2" as const,
                  seuilGlobal: r.seuilGlobal,
                  montant: Number(r.montant),
                  actif: r.actif,
                }
          ),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.formErrors?.[0] ?? "Échec de la mise à jour.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!confirm("Supprimer définitivement cette visite ?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/visites/${visiteId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.formErrors?.[0] ?? "Échec de la suppression.");
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
      <div className="flex justify-end gap-3 text-sm">
        <Link href={`/admin/visites/${visiteId}`} className="text-stone-600 underline hover:text-stone-900">
          Modifier
        </Link>
        <button
          type="button"
          disabled={loading}
          onClick={toggleVisible}
          className="text-stone-600 underline hover:text-stone-900 disabled:opacity-50"
        >
          {visible ? "Masquer" : "Publier"}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={remove}
          className="text-red-600 underline hover:text-red-800 disabled:opacity-50"
        >
          Supprimer
        </button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
