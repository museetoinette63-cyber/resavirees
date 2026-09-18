/**
 * Transport e-mail (Nodemailer) — cahier des charges §5/§6 (envoi devis,
 * facture, notifications de workflow).
 *
 * Configuration via variables d'environnement (voir `.env.example`) :
 * `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`.
 */

import nodemailer, { type Transporter } from "nodemailer";

export interface MailAttachment {
  filename: string;
  content: Buffer;
}

export interface SendMailParams {
  to: string;
  subject: string;
  html: string;
  attachments?: MailAttachment[];
}

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // SMTPS implicite ; 587/25 utilisent STARTTLS
    auth: user && pass ? { user, pass } : undefined,
  });

  return cachedTransporter;
}

/** Envoie un e-mail via le transport SMTP configuré. */
export async function sendMail({ to, subject, html, attachments }: SendMailParams): Promise<void> {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
    attachments: attachments?.map((attachment) => ({
      filename: attachment.filename,
      content: attachment.content,
    })),
  });
}
