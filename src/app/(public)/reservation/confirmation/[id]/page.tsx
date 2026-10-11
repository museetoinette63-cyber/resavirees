import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDateTimeParis } from "@/lib/formatDate";
import { CadreOrne, Fleuron } from "@/components/public/Ornaments";

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
    <CadreOrne className="mx-auto max-w-2xl space-y-6 bg-cream-2/70 text-center">
      <h1
        style={{ animationDelay: "100ms" }}
        className="animate-fade-in-up font-title text-3xl font-black leading-tight text-wine-dark sm:text-4xl"
      >
        Votre demande a bien été enregistrée
      </h1>
      <Fleuron className="mx-auto h-6 w-56 text-ochre" />
      <p style={{ animationDelay: "160ms" }} className="animate-fade-in-up text-xl text-ink">
        Merci {reservation.nomOuRaisonSociale}, votre demande de réservation pour{" "}
        <strong>{reservation.creneau.visite.nom}</strong> le{" "}
        <strong>{formatDateTimeParis(reservation.creneau.dateHeure)}</strong> a bien été prise en compte.
      </p>
      <p style={{ animationDelay: "220ms" }} className="animate-fade-in-up text-lg text-ink-soft">
        Vous allez recevoir un e-mail de confirmation à l&apos;adresse {reservation.email}. Notre équipe
        vous enverra prochainement un devis détaillé.
      </p>
      <Link
        href="/"
        style={{ animationDelay: "280ms" }}
        className="animate-fade-in-up inline-block border-2 border-ochre bg-wine px-6 py-2 font-display text-lg tracking-wide text-cream transition-[background-color,transform] duration-150 ease-snappy hover:bg-wine-dark active:scale-[0.98]"
      >
        Retour à l&apos;accueil
      </Link>
    </CadreOrne>
  );
}
