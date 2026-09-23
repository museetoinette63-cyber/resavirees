import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CarrouselForm from "../CarrouselForm";
import CarrouselDeleteButton from "../CarrouselDeleteButton";

export default async function EditPhotoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const photo = await prisma.photoCarrousel.findUnique({ where: { id } });

  if (!photo) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-stone-900">Modifier la photo</h1>
        <CarrouselDeleteButton photoId={photo.id} redirectTo="/admin/carrousel" />
      </div>
      <CarrouselForm
        mode="edit"
        photoId={photo.id}
        initialData={{
          url: photo.url,
          legende: photo.legende,
          ordre: photo.ordre,
          actif: photo.actif,
        }}
      />
    </div>
  );
}
