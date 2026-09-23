import { prisma } from "@/lib/prisma";
import ProduitForm from "../ProduitForm";

export default async function NouveauProduitPage() {
  const visites = await prisma.visite.findMany({
    orderBy: { nom: "asc" },
    select: { id: true, nom: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-stone-900">Nouveau produit</h1>
      <ProduitForm mode="create" visites={visites} />
    </div>
  );
}
