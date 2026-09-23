import { prisma } from "@/lib/prisma";
import NouvelleFactureForm from "./nouvelle-facture-form";

export default async function NouvelleFacturePage() {
  const devisSansFacture = await prisma.devis.findMany({
    where: { facture: null },
    orderBy: { createdAt: "desc" },
    include: { client: true, reservation: true },
  });

  const options = devisSansFacture.map((d) => ({
    id: d.id,
    label: `${d.numero} — ${d.client?.nomOuRaisonSociale ?? d.reservation?.nomOuRaisonSociale ?? "?"}`,
    montantTotal: d.montantTotal.toString(),
    nbAdultes: d.nbAdultes,
    nbEnfants: d.nbEnfants,
  }));

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-semibold text-stone-900">Nouvelle facture</h1>
      <p className="text-sm text-stone-500">
        Rattachée à un devis existant sans facture. Les montants sont pré-remplis depuis le devis, mais
        modifiables.
      </p>
      <NouvelleFactureForm devisOptions={options} />
    </div>
  );
}
