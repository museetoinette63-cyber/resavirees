import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BlocForm from "../BlocForm";
import BlocDeleteButton from "../BlocDeleteButton";

export default async function EditBlocPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const bloc = await prisma.blocContenu.findUnique({ where: { id } });

  if (!bloc) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-stone-900">Modifier le bloc</h1>
        <BlocDeleteButton blocId={bloc.id} redirectTo="/admin/blocs" />
      </div>
      <BlocForm
        mode="edit"
        blocId={bloc.id}
        initialData={{
          type: bloc.type,
          emplacement: bloc.emplacement,
          titre: bloc.titre,
          contenu: bloc.contenu,
          imageUrl: bloc.imageUrl,
          ordre: bloc.ordre,
          actif: bloc.actif,
        }}
      />
    </div>
  );
}
