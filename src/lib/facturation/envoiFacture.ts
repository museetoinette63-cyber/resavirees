import { put } from "@vercel/blob";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { renderFacturePdf } from "@/lib/pdf/facturePdf";
import { sendMail } from "@/lib/email/mailer";
import { factureEnvoyeeEmail } from "@/lib/email/templates";
import { calculerSolde } from "./solde";

// Relations nécessaires au rendu PDF d'une facture (voir FactureWithRelations).
export const FACTURE_INCLUDE = {
  devis: {
    include: {
      reservation: { include: { creneau: { include: { visite: true } } } },
      client: true,
    },
  },
  client: true,
  lignes: true,
} satisfies Prisma.FactureInclude;

export class ErreurFacture extends Error {
  constructor(
    message: string,
    public readonly statut: number
  ) {
    super(message);
  }
}

export function chargerFacture(id: string) {
  return prisma.facture.findUnique({ where: { id }, include: FACTURE_INCLUDE });
}

/**
 * Génère le PDF de la facture, l'enregistre, l'envoie par e-mail au client
 * (pièce jointe) puis marque la facture comme envoyée. Le marquage n'a lieu
 * qu'APRÈS un envoi réussi : en cas d'échec SMTP, la facture reste « non
 * envoyée » et l'erreur remonte à l'appelant.
 */
export async function envoyerFacture(id: string): Promise<{ to: string }> {
  const facture = await chargerFacture(id);
  if (!facture) throw new ErreurFacture("Facture introuvable.", 404);

  const reservation = facture.devis.reservation;
  const client = facture.client ?? facture.devis.client;
  const to = client?.email ?? reservation?.email;
  if (!to) {
    throw new ErreurFacture(
      "Aucune adresse e-mail n'est renseignée pour ce client : ajoutez-la sur sa fiche avant d'envoyer la facture.",
      400
    );
  }
  const nom = client?.nomOuRaisonSociale ?? reservation?.nomOuRaisonSociale ?? "";

  const pdf = await renderFacturePdf(facture);
  const blob = await put(`factures/${facture.numero}.pdf`, pdf, {
    access: "public",
    contentType: "application/pdf",
    allowOverwrite: true,
  });

  const solde = calculerSolde(facture, facture.devis);
  const { subject, html } = factureEnvoyeeEmail(
    {
      numero: facture.numero,
      montantFinal: facture.montantFinal,
      acompteRegle: solde.acompteRegle,
      resteAPayer: solde.resteAPayer,
    },
    { nomOuRaisonSociale: nom }
  );

  try {
    await sendMail({
      to,
      subject,
      html,
      attachments: [{ filename: `${facture.numero}.pdf`, content: pdf }],
    });
  } catch (err) {
    console.error("[envoyerFacture] échec de l'envoi :", err);
    throw new ErreurFacture(
      "L'e-mail n'a pas pu être envoyé. Vérifiez la configuration de l'envoi d'e-mails (Vercel : variables SMTP_*).",
      502
    );
  }

  await prisma.facture.update({
    where: { id },
    data: { pdfUrl: blob.url, envoyeeLe: new Date() },
  });

  return { to };
}
