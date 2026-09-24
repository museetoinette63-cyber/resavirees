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
    <div className="mx-auto max-w-xl space-y-6 rounded-lg border-2 border-border-warm bg-cream-2 p-8 text-center shadow-sm">
      <div className="animate-scale-in mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gold-light text-xl text-rust-dark">
        ✓
      </div>
      <h1
        style={{ animationDelay: "100ms" }}
        className="animate-fade-in-up font-display text-2xl font-semibold tracking-tight text-rust-dark"
      >
        Votre demande a bien été enregistrée
      </h1>
      <p style={{ animationDelay: "160ms" }} className="animate-fade-in-up text-ink">
        Merci {reservation.nomOuRaisonSociale}, votre demande de réservation pour{" "}
        <strong>{reservation.creneau.visite.nom}</strong> le{" "}
        <strong>{formatDateTimeParis(reservation.creneau.dateHeure)}</strong> a bien été prise en compte.
      </p>
      <p style={{ animationDelay: "220ms" }} className="animate-fade-in-up text-sm text-ink-soft">
        Vous allez recevoir un e-mail de confirmation à l&apos;adresse {reservation.email}. Notre équipe
        vous enverra prochainement un devis détaillé.
      </p>
      <Link
        href="/"
        style={{ animationDelay: "280ms" }}
        className="animate-fade-in-up inline-block rounded-md bg-rust px-4 py-2 text-sm font-semibold text-cream transition-[background-color,transform] duration-150 ease-snappy hover:bg-rust-dark active:scale-[0.98]"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
