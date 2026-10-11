import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { PrismaTransactionClient } from "@/lib/reservationWorkflow/transitions";
import {
  ErreurDestinataire,
  appliquerDestinataire,
  lireDestinataire,
} from "@/lib/facturation/destinataire";

interface LigneInput {
  produitId?: string | null;
  denomination?: string;
  quantite?: number;
  prixUnitaire?: number;
}

const arrondi = (n: number) => Math.round(n * 100) / 100;

/** Même validation que POST /api/admin/devis — voir ce fichier pour le détail des règles. */
function validateLignes(
  lignes: unknown
):
  | {
      ok: true;
      lignes: {
        produitId: string | null;
        denomination: string;
        quantite: number;
        prixUnitaire: number;
        ordre: number;
      }[];
    }
  | { ok: false; error: string } {
  if (!Array.isArray(lignes) || lignes.length === 0) {
    return { ok: false, error: "Au moins une ligne est requise." };
  }

  const parsed: {
    produitId: string | null;
    denomination: string;
    quantite: number;
    prixUnitaire: number;
    ordre: number;
  }[] = [];

  for (let i = 0; i < lignes.length; i++) {
    const l = lignes[i] as LigneInput;
    const denomination = typeof l?.denomination === "string" ? l.denomination.trim() : "";
    const quantite = Number(l?.quantite);
    const prixUnitaire = Number(l?.prixUnitaire);

    if (!denomination) {
      return { ok: false, error: `Ligne ${i + 1} : la dénomination est requise.` };
    }
    if (!Number.isFinite(quantite) || !Number.isInteger(quantite) || quantite <= 0) {
      return { ok: false, error: `Ligne ${i + 1} : la quantité doit être un entier positif.` };
    }
    if (!Number.isFinite(prixUnitaire) || prixUnitaire < 0) {
      return { ok: false, error: `Ligne ${i + 1} : le prix unitaire doit être un nombre positif.` };
    }

    parsed.push({
      produitId: typeof l?.produitId === "string" && l.produitId ? l.produitId : null,
      denomination,
      quantite,
      prixUnitaire,
      ordre: i,
    });
  }

  return { ok: true, lignes: parsed };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const devis = await prisma.devis.findUnique({
    where: { id },
    include: {
      client: true,
      reservation: { include: { creneau: { include: { visite: true } } } },
      facture: true,
      lignes: { orderBy: { ordre: "asc" } },
    },
  });

  if (!devis) {
    return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
  }

  return NextResponse.json({ devis });
}

function dateOuNull(valeur: unknown): Date | null | undefined {
  if (valeur === undefined) return undefined;
  if (valeur === null || valeur === "") return null;
  const d = new Date(String(valeur));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * Édition d'un devis : tous les champs sont modifiables, y compris pour un
 * devis rattaché à une réservation (client, personnes, date/heure/durée,
 * lignes, notes, acompte complet). Le montant total est TOUJOURS recalculé
 * côté serveur à partir des lignes. Modifier un devis ne change jamais le
 * statut de la réservation liée (celui-ci reste géré depuis sa fiche).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const devis = await prisma.devis.findUnique({ where: { id } });
  if (!devis) {
    return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        clientId?: string | null;
        nbAdultes?: number;
        nbEnfants?: number;
        lignes?: LigneInput[];
        dateEvenement?: string | null;
        dureeMinutes?: number | null;
        notes?: string | null;
        acomptePourcentage?: number;
        acompteMontant?: number;
        acompteDelaiJours?: number;
        acompteDateLimite?: string | null;
        acompteStatutPaiement?: "EN_ATTENTE" | "RECU" | "EXPIRE";
        acompteDateReglement?: string | null;
        acompteReferenceReglement?: string | null;
        destinataire?: unknown;
      }
    | null;
  if (!body) {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  let destinataire: ReturnType<typeof lireDestinataire>;
  try {
    destinataire = lireDestinataire(body.destinataire);
  } catch (err) {
    if (err instanceof ErreurDestinataire) {
      return NextResponse.json({ error: err.message }, { status: err.statut });
    }
    throw err;
  }

  const data: Record<string, unknown> = {};

  if (body.clientId !== undefined) {
    if (!body.clientId) {
      if (!devis.reservationId) {
        return NextResponse.json({ error: "Le client est requis." }, { status: 400 });
      }
      data.clientId = null;
    } else {
      const client = await prisma.client.findUnique({ where: { id: body.clientId } });
      if (!client) {
        return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
      }
      data.clientId = client.id;
    }
  }

  if (body.nbAdultes !== undefined) {
    const v = Number(body.nbAdultes);
    if (!Number.isFinite(v) || v < 0) {
      return NextResponse.json({ error: "nbAdultes invalide." }, { status: 400 });
    }
    data.nbAdultes = v;
  }
  if (body.nbEnfants !== undefined) {
    const v = Number(body.nbEnfants);
    if (!Number.isFinite(v) || v < 0) {
      return NextResponse.json({ error: "nbEnfants invalide." }, { status: 400 });
    }
    data.nbEnfants = v;
  }

  let lignesResult: ReturnType<typeof validateLignes> | null = null;
  let montantTotal = Number(devis.montantTotal);
  if (body.lignes !== undefined) {
    lignesResult = validateLignes(body.lignes);
    if (!lignesResult.ok) {
      return NextResponse.json({ error: lignesResult.error }, { status: 400 });
    }
    montantTotal = arrondi(lignesResult.lignes.reduce((sum, l) => sum + l.quantite * l.prixUnitaire, 0));
    data.montantTotal = montantTotal;
    data.coutIndividuelTotal = montantTotal;
    data.montantAvantMajoration = montantTotal;
    // Les lignes font foi : un forfait/une majoration calculés à la création
    // ne correspondent plus au nouveau total.
    data.forfaitApplique = null;
    data.montantForfait = null;
    data.majorationTardiveAppliquee = false;
    data.montantMajoration = 0;
  }

  if (body.dateEvenement !== undefined) {
    const d = dateOuNull(body.dateEvenement);
    if (d === undefined) {
      return NextResponse.json({ error: "dateEvenement invalide." }, { status: 400 });
    }
    data.dateEvenement = d;
  }
  if (body.dureeMinutes !== undefined) {
    if (body.dureeMinutes === null) {
      data.dureeMinutes = null;
    } else {
      const v = Number(body.dureeMinutes);
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: "dureeMinutes invalide." }, { status: 400 });
      }
      data.dureeMinutes = v;
    }
  }
  if (body.notes !== undefined) {
    data.notes = body.notes || null;
  }

  // --- Acompte -----------------------------------------------------------
  let pourcentage = Number(devis.acomptePourcentage);
  if (body.acomptePourcentage !== undefined) {
    pourcentage = Number(body.acomptePourcentage);
    if (!Number.isFinite(pourcentage) || pourcentage < 0 || pourcentage > 100) {
      return NextResponse.json({ error: "Le pourcentage d'acompte doit être compris entre 0 et 100." }, { status: 400 });
    }
    data.acomptePourcentage = pourcentage;
  }
  if (body.acompteMontant !== undefined) {
    const v = Number(body.acompteMontant);
    if (!Number.isFinite(v) || v < 0 || v > montantTotal) {
      return NextResponse.json(
        { error: "Le montant de l'acompte doit être compris entre 0 et le montant total du devis." },
        { status: 400 }
      );
    }
    data.acompteMontant = arrondi(v);
  } else if (body.acomptePourcentage !== undefined || body.lignes !== undefined) {
    data.acompteMontant = arrondi((montantTotal * pourcentage) / 100);
  }
  if (body.acompteDelaiJours !== undefined) {
    const v = Number(body.acompteDelaiJours);
    if (!Number.isInteger(v) || v < 0) {
      return NextResponse.json({ error: "Le délai de l'acompte doit être un nombre entier de jours." }, { status: 400 });
    }
    data.acompteDelaiJours = v;
  }
  if (body.acompteDateLimite !== undefined) {
    const d = dateOuNull(body.acompteDateLimite);
    if (d === undefined) {
      return NextResponse.json({ error: "Date limite d'acompte invalide." }, { status: 400 });
    }
    data.acompteDateLimite = d;
  }
  if (body.acompteDateReglement !== undefined) {
    const d = dateOuNull(body.acompteDateReglement);
    if (d === undefined) {
      return NextResponse.json({ error: "Date de règlement de l'acompte invalide." }, { status: 400 });
    }
    data.acompteDateReglement = d;
  }
  if (body.acompteReferenceReglement !== undefined) {
    data.acompteReferenceReglement = body.acompteReferenceReglement || null;
  }
  if (body.acompteStatutPaiement !== undefined) {
    data.acompteStatutPaiement = body.acompteStatutPaiement;
    if (body.acompteStatutPaiement === "RECU") {
      if (data.acompteDateReglement === undefined && !devis.acompteDateReglement) {
        data.acompteDateReglement = new Date();
      }
    } else {
      data.acompteDateReglement = null;
      data.acompteReferenceReglement = null;
    }
  }

  try {
    const updated = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      if (lignesResult && lignesResult.ok) {
        await tx.devisLigne.deleteMany({ where: { devisId: id } });
        await tx.devisLigne.createMany({
          data: lignesResult.lignes.map((l) => ({
            devisId: id,
            produitId: l.produitId,
            denomination: l.denomination,
            quantite: l.quantite,
            prixUnitaire: l.prixUnitaire,
            montantLigne: l.quantite * l.prixUnitaire,
            ordre: l.ordre,
          })),
        });
      }
      const resultat = await tx.devis.update({
        where: { id },
        data,
        include: { lignes: { orderBy: { ordre: "asc" } } },
      });
      if (destinataire) {
        await appliquerDestinataire(
          tx,
          {
            clientId: data.clientId !== undefined ? (data.clientId as string | null) : devis.clientId,
            reservationId: devis.reservationId,
          },
          destinataire
        );
      }
      return resultat;
    });

    return NextResponse.json({ devis: updated });
  } catch (err) {
    if (err instanceof ErreurDestinataire) {
      return NextResponse.json({ error: err.message }, { status: err.statut });
    }
    throw err;
  }
}
