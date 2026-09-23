import BlocForm from "../BlocForm";

export default function NouveauBlocPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-stone-900">Nouveau bloc de contenu</h1>
      <BlocForm mode="create" />
    </div>
  );
}
