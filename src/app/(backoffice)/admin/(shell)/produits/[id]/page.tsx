import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProduitForm from "../ProduitForm";
import ProduitDeleteButton from "../ProduitDeleteButton";

export default async function EditProduitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [produit, visites] = await Promise.all([
    prisma.produit.findUnique({ where: { id } }),
    prisma.visite.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
  ]);

  if (!produit) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-stone-900">Modifier le produit</h1>
        <ProduitDeleteButton produitId={produit.id} redirectTo="/admin/produits" />
      </div>
      <ProduitForm
        mode="edit"
        produitId={produit.id}
        visites={visites}
        initialData={{
          nom: produit.nom,
          description: produit.description,
          prixUnitaire: produit.prixUnitaire.toString(),
          dureeMinutes: produit.dureeMinutes,
          actif: produit.actif,
          visiteId: produit.visiteId,
        }}
      />
    </div>
  );
}
