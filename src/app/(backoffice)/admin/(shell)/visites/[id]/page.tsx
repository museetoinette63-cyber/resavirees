import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import VisiteForm from "../VisiteForm";

export default async function EditVisitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const visite = await prisma.visite.findUnique({
    where: { id },
    include: { reglesForfait: true },
  });

  if (!visite) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-stone-900">Modifier la visite</h1>
      <VisiteForm
        mode="edit"
        visiteId={visite.id}
        initialData={{
          nom: visite.nom,
          slug: visite.slug,
          description: visite.description,
          imageBanniereUrl: visite.imageBanniereUrl,
          visible: visite.visible,
          tarifAdulte: visite.tarifAdulte.toString(),
          tarifEnfant: visite.tarifEnfant.toString(),
          majorationTardiveMontant: visite.majorationTardiveMontant.toString(),
          majorationTardiveDelaiHeures: visite.majorationTardiveDelaiHeures,
          acomptePourcentage: visite.acomptePourcentage.toString(),
          acompteDelaiJours: visite.acompteDelaiJours,
          reglesForfait: visite.reglesForfait.map((r) => ({
            niveau: r.niveau,
            seuilAdultes: r.seuilAdultes,
            seuilEnfants: r.seuilEnfants,
            seuilGlobal: r.seuilGlobal,
            montant: r.montant.toString(),
            actif: r.actif,
          })),
        }}
      />
    </div>
  );
}
