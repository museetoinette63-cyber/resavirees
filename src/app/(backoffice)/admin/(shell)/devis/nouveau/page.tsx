import { prisma } from "@/lib/prisma";
import NouveauDevisForm from "./nouveau-devis-form";

export default async function NouveauDevisPage() {
  const [clients, produits] = await Promise.all([
    prisma.client.findMany({
      orderBy: { nomOuRaisonSociale: "asc" },
      select: { id: true, nomOuRaisonSociale: true, email: true },
    }),
    prisma.produit.findMany({
      where: { actif: true },
      orderBy: { nom: "asc" },
      select: { id: true, nom: true, prixUnitaire: true, dureeMinutes: true },
    }),
  ]);

  const produitOptions = produits.map((p) => ({
    id: p.id,
    nom: p.nom,
    prixUnitaire: p.prixUnitaire.toString(),
    dureeMinutes: p.dureeMinutes,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-stone-900">Nouveau devis</h1>
      <p className="text-sm text-stone-500">
        Ajout manuel, hors parcours de réservation en ligne. Le moteur de tarification ne s&apos;applique
        pas : le devis se construit à partir de lignes (produits du catalogue ou lignes libres), comme une
        facture classique.
      </p>
      <NouveauDevisForm clients={clients} produits={produitOptions} />
    </div>
  );
}
