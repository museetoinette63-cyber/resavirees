import VisiteForm from "../VisiteForm";

export default function NouvelleVisitePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-stone-900">Nouvelle visite</h1>
      <VisiteForm mode="create" />
    </div>
  );
}
