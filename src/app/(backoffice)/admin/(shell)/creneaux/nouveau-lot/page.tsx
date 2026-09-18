import { prisma } from "@/lib/prisma";
import CreneauBulkForm from "./CreneauBulkForm";

export default async function CreneauNouveauLotPage() {
  const visites = await prisma.visite.findMany({
    orderBy: { nom: "asc" },
    select: { id: true, nom: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-stone-900">Créer des créneaux en lot</h1>
      {visites.length === 0 ? (
        <p className="text-sm text-stone-500">
          Créez d&apos;abord une visite avant de pouvoir générer des créneaux.
        </p>
      ) : (
        <CreneauBulkForm visites={visites} />
      )}
    </div>
  );
}
