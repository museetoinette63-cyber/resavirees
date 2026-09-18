/**
 * Templates d'e-mail — cahier des charges §7 : "Format des e-mails → templates
 * par défaut simples, faciles à éditer ensuite". Chaque fonction retourne un
 * couple { subject, html } prêt pour `sendMail()` (voir `mailer.ts`).
 */

import type { Prisma } from "@prisma/client";

function formatMontant(value: Prisma.Decimal | number): string {
  const num = typeof value === "number" ? value : value.toNumber();
  return num.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function wrapHtml(title: string, bodyHtml: string): string {
  return `
    <div style="font-family: Arial, sans-serif; color: #1a1a1a; line-height: 1.5;">
      <h2 style="color: #2b2b2b;">${title}</h2>
      ${bodyHtml}
      <p style="margin-top: 24px; font-size: 12px; color: #666;">
        Cet e-mail est envoyé automatiquement, merci de ne pas y répondre directement.
      </p>
    </div>
  `;
}

/** Envoyée à la création d'une demande de réservation (statut DEMANDE_RECUE). */
export function demandeRecueEmail(reservation: { nomOuRaisonSociale: string }): {
  subject: string;
  html: string;
} {
  const subject = "Votre demande de réservation a bien été reçue";
  const html = wrapHtml(subject, `
    <p>Bonjour ${reservation.nomOuRaisonSociale},</p>
    <p>
      Nous avons bien reçu votre demande de réservation de visite guidée théâtralisée.
      Notre équipe va l'étudier et vous fera parvenir un devis dans les meilleurs délais.
    </p>
    <p>Merci de votre confiance.</p>
  `);
  return { subject, html };
}

/** Envoyée à l'envoi du devis au client (statut DEVIS_ENVOYE). */
export function devisEnvoyeEmail(
  devis: {
    numero: string;
    montantTotal: Prisma.Decimal;
    acomptePourcentage: Prisma.Decimal;
    acompteMontant: Prisma.Decimal;
    acompteDateLimite: Date | null;
  },
  reservation: { nomOuRaisonSociale: string }
): { subject: string; html: string } {
  const subject = `Votre devis ${devis.numero}`;
  const dateLimite = devis.acompteDateLimite
    ? formatDate(devis.acompteDateLimite)
    : "communiquée ultérieurement";

  const html = wrapHtml(subject, `
    <p>Bonjour ${reservation.nomOuRaisonSociale},</p>
    <p>
      Veuillez trouver ci-joint votre devis <strong>${devis.numero}</strong> d'un montant total de
      <strong>${formatMontant(devis.montantTotal)}</strong> (TVA non applicable, association non
      assujettie).
    </p>
    <p>
      Un acompte de ${devis.acomptePourcentage.toString()}% (<strong>${formatMontant(devis.acompteMontant)}</strong>)
      est à régler avant le <strong>${dateLimite}</strong> pour confirmer votre réservation.
    </p>
    <p>Nous restons à votre disposition pour toute question.</p>
  `);
  return { subject, html };
}

/** Envoyée par le job planifié lorsque le délai de règlement de l'acompte est dépassé (statut ACOMPTE_EXPIRE). */
export function acompteExpireEmail(
  devis: { numero: string },
  reservation: { nomOuRaisonSociale: string }
): { subject: string; html: string } {
  const subject = `Acompte non réglé — devis ${devis.numero}`;
  const html = wrapHtml(subject, `
    <p>Bonjour ${reservation.nomOuRaisonSociale},</p>
    <p>
      Le délai de règlement de l'acompte pour votre devis <strong>${devis.numero}</strong> est
      dépassé. Votre créneau n'est donc plus garanti.
    </p>
    <p>
      Si vous souhaitez toujours réserver, n'hésitez pas à nous contacter afin que nous
      étudiions ensemble les disponibilités restantes.
    </p>
  `);
  return { subject, html };
}

/** Envoyée à l'envoi de la facture au client (statut FACTURE_ENVOYEE). */
export function factureEnvoyeeEmail(
  facture: { numero: string; montantFinal: Prisma.Decimal },
  reservation: { nomOuRaisonSociale: string }
): { subject: string; html: string } {
  const subject = `Votre facture ${facture.numero}`;
  const html = wrapHtml(subject, `
    <p>Bonjour ${reservation.nomOuRaisonSociale},</p>
    <p>
      Veuillez trouver ci-joint votre facture <strong>${facture.numero}</strong> d'un montant final de
      <strong>${formatMontant(facture.montantFinal)}</strong> (TVA non applicable, association non
      assujettie).
    </p>
    <p>Merci de procéder au règlement du solde restant dû selon les modalités convenues.</p>
  `);
  return { subject, html };
}
