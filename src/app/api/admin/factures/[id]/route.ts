import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { PrismaTransactionClient } from "@/lib/reservationWorkflow/transitions";

interface LigneInput {
  produitId?: string | null;
  denomination?: string;
  quantite?: number;
  prixUnitaire?: number;
}

/** Même validation que POST /api/admin/factures — voir ce fichier pour le détail des règles. */
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
  const facture = await prisma.facture.findUnique({
    where: { id },
    include: {
      client: true,
      devis: { include: { reservation: { include: { creneau: { include: { visite: true } } } } } },
      lignes: { orderBy: { ordre: "asc" } },
    },
  });

  if (!facture) {
    return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
  }

  return NextResponse.json({ facture });
}

/**
 * Édition d'une facture — même garde-fou que pour les devis : si la facture
 * découle d'une réservation (via son devis lié), les montants/le statut du
 * solde se gèrent depuis la fiche réservation pour ne pas désynchroniser le
 * cycle de vie. Toujours éditable ici : la note de litige (§5.3, non
 * bloquante par nature, peut être ajoutée depuis n'importe où).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const facture = await prisma.facture.findUnique({ where: { id }, include: { devis: true } });
  if (!facture) {
    return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        nbAdultesReel?: number;
        nbEnfantsReel?: number;
        montantFinal?: number;
        lignes?: LigneInput[];
        notes?: string | null;
        soldeStatutPaiement?: "EN_ATTENTE" | "RECU" | "EXPIRE";
        soldeDateReglement?: string | null;
        soldeReferenceReglement?: string | null;
        noteLitige?: string | null;
      }
    | null;

  const estRattacheeAUneReservation = !!facture.devis.reservationId;

  const data: Record<string, unknown> = {};

  if (body?.noteLitige !== undefined) {
    data.noteLitige = body.noteLitige;
  }
  if (body?.notes !== undefined) {
    data.notes = body.notes || null;
  }

  let lignesResult: ReturnType<typeof validateLignes> | null = null;

  if (
    !estRattacheeAUneReservation &&
    (body?.nbAdultesReel !== undefined ||
      body?.nbEnfantsReel !== undefined ||
      body?.montantFinal !== undefined ||
      body?.lignes !== undefined ||
      body?.soldeStatutPaiement !== undefined)
  ) {
    if (body?.nbAdultesReel !== undefined) {
      const v = Number(body.nbAdultesReel);
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: "nbAdultesReel invalide." }, { status: 400 });
      }
      data.nbAdultesReel = v;
    }
    if (body?.nbEnfantsReel !== undefined) {
      const v = Number(body.nbEnfantsReel);
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: "nbEnfantsReel invalide." }, { status: 400 });
      }
      data.nbEnfantsReel = v;
    }
    if (body?.lignes !== undefined) {
      lignesResult = validateLignes(body.lignes);
      if (!lignesResult.ok) {
        return NextResponse.json({ error: lignesResult.error }, { status: 400 });
      }
      const montantFinal = lignesResult.lignes.reduce((sum, l) => sum + l.quantite * l.prixUnitaire, 0);
      data.montantFinal = montantFinal;
      data.ajuste = true;
      data.ajusteLe = new Date();
      data.ajustePar = session.user.email;
    } else if (body?.montantFinal !== undefined) {
      const v = Number(body.montantFinal);
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: "montantFinal invalide." }, { status: 400 });
      }
      data.montantFinal = v;
      data.ajuste = true;
      data.ajusteLe = new Date();
      data.ajustePar = session.user.email;
    }
    if (body?.soldeStatutPaiement !== undefined) {
      data.soldeStatutPaiement = body.soldeStatutPaiement;
      if (body.soldeStatutPaiement === "RECU") {
        data.soldeDateReglement = body.soldeDateReglement ? new Date(body.soldeDateReglement) : new Date();
        data.soldeReferenceReglement = body.soldeReferenceReglement ?? null;
      }
    }
  } else if (
    estRattacheeAUneReservation &&
    (body?.nbAdultesReel !== undefined ||
      body?.nbEnfantsReel !== undefined ||
      body?.montantFinal !== undefined ||
      body?.lignes !== undefined ||
      body?.soldeStatutPaiement !== undefined)
  ) {
    return NextResponse.json(
      {
        error:
          "Cette facture est rattachée à une réservation : gérez son montant et son solde depuis la fiche réservation pour rester cohérent avec le cycle de vie.",
      },
      { status: 409 }
    );
  }

  const updated = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    if (lignesResult && lignesResult.ok) {
      await tx.factureLigne.deleteMany({ where: { factureId: id } });
      await tx.factureLigne.createMany({
        data: lignesResult.lignes.map((l) => ({
          factureId: id,
          produitId: l.produitId,
          denomination: l.denomination,
          quantite: l.quantite,
          prixUnitaire: l.prixUnitaire,
          montantLigne: l.quantite * l.prixUnitaire,
          ordre: l.ordre,
        })),
      });
    }
    return tx.facture.update({ where: { id }, data, include: { lignes: { orderBy: { ordre: "asc" } } } });
  });

  return NextResponse.json({ facture: updated });
}
