import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDateTimeParis } from "@/lib/formatDate";

// Each id is a freshly created reservation — never statically prerendered
// (see (public)/page.tsx for full rationale).
export const dynamic = "force-dynamic";

export default async function ConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { creneau: { include: { visite: true } } },
  });

  if (!reservation) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 rounded-lg border border-stone-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-xl text-green-700">
        ✓
      </div>
      <h1 className="text-2xl font-semibold text-stone-900">Votre demande a bien été enregistrée</h1>
      <p className="text-stone-600">
        Merci {reservation.nomOuRaisonSociale}, votre demande de réservation pour{" "}
        <strong>{reservation.creneau.visite.nom}</strong> le{" "}
        <strong>{formatDateTimeParis(reservation.creneau.dateHeure)}</strong> a bien été prise en compte.
      </p>
      <p className="text-sm text-stone-500">
        Vous allez recevoir un e-mail de confirmation à l&apos;adresse {reservation.email}. Notre équipe
        vous enverra prochainement un devis détaillé.
      </p>
      <Link
        href="/"
        className="inline-block rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
