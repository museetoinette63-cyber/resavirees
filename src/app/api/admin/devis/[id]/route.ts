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

/**
 * Édition d'un devis. Pour un devis rattaché à une réservation, seule la
 * note libre (`notesAdmin` sur la réservation, pas ce devis) devrait passer
 * par le cycle de vie de la réservation (§5 du cahier des charges) — cette
 * route refuse donc de modifier les montants/le statut d'acompte d'un devis
 * lié (`reservationId` non nul), pour ne jamais désynchroniser la machine à
 * états. Un devis manuel (`origineManuelle: true`) reste librement éditable
 * ici : montants, et pointage de l'acompte (statut/date/référence).
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

  if (devis.reservationId) {
    return NextResponse.json(
      {
        error:
          "Ce devis est rattaché à une réservation : gérez ses montants et son acompte depuis la fiche réservation pour rester cohérent avec le cycle de vie.",
      },
      { status: 409 }
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        nbAdultes?: number;
        nbEnfants?: number;
        lignes?: LigneInput[];
        dateEvenement?: string | null;
        dureeMinutes?: number | null;
        notes?: string | null;
        acompteStatutPaiement?: "EN_ATTENTE" | "RECU" | "EXPIRE";
        acompteDateReglement?: string | null;
        acompteReferenceReglement?: string | null;
      }
    | null;

  const data: Record<string, unknown> = {};

  if (body?.nbAdultes !== undefined) {
    const v = Number(body.nbAdultes);
    if (!Number.isFinite(v) || v < 0) {
      return NextResponse.json({ error: "nbAdultes invalide." }, { status: 400 });
    }
    data.nbAdultes = v;
  }
  if (body?.nbEnfants !== undefined) {
    const v = Number(body.nbEnfants);
    if (!Number.isFinite(v) || v < 0) {
      return NextResponse.json({ error: "nbEnfants invalide." }, { status: 400 });
    }
    data.nbEnfants = v;
  }

  let lignesResult: ReturnType<typeof validateLignes> | null = null;
  if (body?.lignes !== undefined) {
    lignesResult = validateLignes(body.lignes);
    if (!lignesResult.ok) {
      return NextResponse.json({ error: lignesResult.error }, { status: 400 });
    }
    const montantTotal = lignesResult.lignes.reduce((sum, l) => sum + l.quantite * l.prixUnitaire, 0);
    data.montantTotal = montantTotal;
    data.coutIndividuelTotal = montantTotal;
    data.montantAvantMajoration = montantTotal;
  }

  if (body?.dateEvenement !== undefined) {
    if (body.dateEvenement === null || body.dateEvenement === "") {
      data.dateEvenement = null;
    } else {
      const d = new Date(body.dateEvenement);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "dateEvenement invalide." }, { status: 400 });
      }
      data.dateEvenement = d;
    }
  }
  if (body?.dureeMinutes !== undefined) {
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
  if (body?.notes !== undefined) {
    data.notes = body.notes || null;
  }

  if (body?.acompteStatutPaiement !== undefined) {
    data.acompteStatutPaiement = body.acompteStatutPaiement;
    if (body.acompteStatutPaiement === "RECU") {
      data.acompteDateReglement = body.acompteDateReglement
        ? new Date(body.acompteDateReglement)
        : new Date();
      data.acompteReferenceReglement = body.acompteReferenceReglement ?? null;
    }
  }

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
    return tx.devis.update({ where: { id }, data, include: { lignes: { orderBy: { ordre: "asc" } } } });
  });

  return NextResponse.json({ devis: updated });
}
