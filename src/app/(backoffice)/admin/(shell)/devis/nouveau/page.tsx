import { prisma } from "@/lib/prisma";
import NouveauDevisForm from "./nouveau-devis-form";

export default async function NouveauDevisPage() {
  const clients = await prisma.client.findMany({
    orderBy: { nomOuRaisonSociale: "asc" },
    select: { id: true, nomOuRaisonSociale: true, email: true },
  });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-semibold text-stone-900">Nouveau devis</h1>
      <p className="text-sm text-stone-500">
        Ajout manuel, hors parcours de réservation en ligne. Le moteur de tarification ne s&apos;applique
        pas : le montant est saisi directement.
      </p>
      <NouveauDevisForm clients={clients} />
    </div>
  );
}
