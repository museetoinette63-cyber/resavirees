import { Prisma } from "@prisma/client";
import type { PrismaTransactionClient } from "@/lib/reservationWorkflow/transitions";

// Modification du destinataire (nom, e-mail, téléphone, adresse) depuis un
// devis ou une facture. Ces informations vivent sur la fiche CLIENT quand le
// document en a une, sinon sur la RÉSERVATION d'origine : on met à jour la
// source qui alimente réellement le document.

export interface DestinataireInput {
  nomOuRaisonSociale?: string;
  email?: string;
  telephone?: string | null;
  adressePostale?: string | null;
}

export class ErreurDestinataire extends Error {
  constructor(
    message: string,
    public readonly statut: number
  ) {
    super(message);
  }
}

/** Valide le bloc `destinataire` d'un corps de requête (undefined = rien à modifier). */
export function lireDestinataire(valeur: unknown): DestinataireInput | undefined {
  if (valeur === undefined || valeur === null) return undefined;
  if (typeof valeur !== "object") throw new ErreurDestinataire("Destinataire invalide.", 400);
  const v = valeur as Record<string, unknown>;
  const sortie: DestinataireInput = {};

  if (v.nomOuRaisonSociale !== undefined) {
    const nom = String(v.nomOuRaisonSociale).trim();
    if (!nom) throw new ErreurDestinataire("Le nom du destinataire est requis.", 400);
    sortie.nomOuRaisonSociale = nom;
  }
  if (v.email !== undefined) {
    const email = String(v.email).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ErreurDestinataire("L'adresse e-mail du destinataire est invalide.", 400);
    }
    sortie.email = email;
  }
  if (v.telephone !== undefined) {
    sortie.telephone = v.telephone === null ? null : String(v.telephone).trim() || null;
  }
  if (v.adressePostale !== undefined) {
    sortie.adressePostale = v.adressePostale === null ? null : String(v.adressePostale).trim() || null;
  }
  return sortie;
}

export async function appliquerDestinataire(
  tx: PrismaTransactionClient,
  cible: { clientId: string | null; reservationId: string | null },
  d: DestinataireInput
): Promise<void> {
  try {
    if (cible.clientId) {
      await tx.client.update({
        where: { id: cible.clientId },
        data: {
          ...(d.nomOuRaisonSociale !== undefined ? { nomOuRaisonSociale: d.nomOuRaisonSociale } : {}),
          ...(d.email !== undefined ? { email: d.email } : {}),
          ...(d.telephone !== undefined ? { telephone: d.telephone } : {}),
          ...(d.adressePostale !== undefined ? { adressePostale: d.adressePostale } : {}),
        },
      });
    } else if (cible.reservationId) {
      // Les coordonnées d'une réservation sont obligatoires : on ne les vide pas.
      await tx.reservation.update({
        where: { id: cible.reservationId },
        data: {
          ...(d.nomOuRaisonSociale !== undefined ? { nomOuRaisonSociale: d.nomOuRaisonSociale } : {}),
          ...(d.email !== undefined ? { email: d.email } : {}),
          ...(d.telephone ? { telephone: d.telephone } : {}),
          ...(d.adressePostale ? { adressePostale: d.adressePostale } : {}),
        },
      });
    }
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ErreurDestinataire("Cette adresse e-mail est déjà utilisée par un autre client.", 409);
    }
    throw err;
  }
}
