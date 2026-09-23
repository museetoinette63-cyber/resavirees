import CarrouselForm from "../CarrouselForm";

export default function NouvellePhotoPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-stone-900">Nouvelle photo</h1>
      <CarrouselForm mode="create" />
    </div>
  );
}
