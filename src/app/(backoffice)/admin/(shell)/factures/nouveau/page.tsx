import { prisma } from "@/lib/prisma";
import NouvelleFactureForm from "./nouvelle-facture-form";

export default async function NouvelleFacturePage() {
  const devisSansFacture = await prisma.devis.findMany({
    where: { facture: null },
    orderBy: { createdAt: "desc" },
    include: { client: true, reservation: true, lignes: { orderBy: { ordre: "asc" } } },
  });

  const options = devisSansFacture.map((d) => ({
    id: d.id,
    label: `${d.numero} — ${d.client?.nomOuRaisonSociale ?? d.reservation?.nomOuRaisonSociale ?? "?"}`,
    nbAdultes: d.nbAdultes,
    nbEnfants: d.nbEnfants,
    lignes: d.lignes.map((l) => ({
      produitId: l.produitId,
      denomination: l.denomination,
      quantite: String(l.quantite),
      prixUnitaire: l.prixUnitaire.toString(),
    })),
  }));

  const produits = await prisma.produit.findMany({
    where: { actif: true },
    orderBy: { nom: "asc" },
    select: { id: true, nom: true, prixUnitaire: true, dureeMinutes: true },
  });
  const produitOptions = produits.map((p) => ({
    id: p.id,
    nom: p.nom,
    prixUnitaire: p.prixUnitaire.toString(),
    dureeMinutes: p.dureeMinutes,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-stone-900">Nouvelle facture</h1>
      <p className="text-sm text-stone-500">
        Rattachée à un devis existant sans facture. Les lignes sont pré-remplies depuis le devis choisi,
        mais restent modifiables avant l&apos;envoi.
      </p>
      <NouvelleFactureForm devisOptions={options} produits={produitOptions} />
    </div>
  );
}
