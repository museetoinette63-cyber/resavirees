import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateNumero } from "@/lib/numbering";
import type { PrismaTransactionClient } from "@/lib/reservationWorkflow/transitions";

/**
 * Liste tous les devis (issus d'une réservation ou ajoutés manuellement),
 * pour l'onglet back-office "Devis" — vue d'ensemble indépendante de la
 * fiche réservation ou du compte client.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const devis = await prisma.devis.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      client: true,
      reservation: { include: { creneau: { include: { visite: true } } } },
      facture: { select: { id: true } },
    },
  });

  return NextResponse.json({ devis });
}

interface LigneInput {
  produitId?: string | null;
  denomination?: string;
  quantite?: number;
  prixUnitaire?: number;
}

interface PostBody {
  clientId?: string;
  nbAdultes?: number;
  nbEnfants?: number;
  lignes?: LigneInput[];
  dateEvenement?: string | null;
  dureeMinutes?: number | null;
  notes?: string | null;
}

/**
 * Valide et normalise le tableau de lignes envoyé par le formulaire (devis
 * manuel). Au moins une ligne est requise ; chaque ligne doit avoir une
 * dénomination non vide, une quantité entière > 0 et un prix unitaire >= 0.
 * Retourne `null` (avec le message d'erreur associé) si invalide.
 */
function validateLignes(
  lignes: unknown
): { ok: true; lignes: { produitId: string | null; denomination: string; quantite: number; prixUnitaire: number; ordre: number }[] } | { ok: false; error: string } {
  if (!Array.isArray(lignes) || lignes.length === 0) {
    return { ok: false, error: "Au moins une ligne est requise." };
  }

  const parsed: { produitId: string | null; denomination: string; quantite: number; prixUnitaire: number; ordre: number }[] = [];

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

/**
 * Création manuelle d'un devis, indépendamment d'un compte client déjà
 * ouvert (cahier des charges §3.4) — bâti à partir d'une liste de lignes
 * (produit du catalogue ou ligne libre), comme sur une facture classique.
 * Le montant total est TOUJOURS recalculé côté serveur à partir des lignes
 * (jamais fait confiance à un total envoyé par le client).
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as PostBody | null;

  const clientId = body?.clientId;
  const nbAdultes = Number(body?.nbAdultes);
  const nbEnfants = Number(body?.nbEnfants);

  if (!clientId) {
    return NextResponse.json({ error: "Le client est requis." }, { status: 400 });
  }
  if (!Number.isFinite(nbAdultes) || nbAdultes < 0 || !Number.isFinite(nbEnfants) || nbEnfants < 0) {
    return NextResponse.json(
      { error: "nbAdultes et nbEnfants doivent être des nombres positifs." },
      { status: 400 }
    );
  }

  const lignesResult = validateLignes(body?.lignes);
  if (!lignesResult.ok) {
    return NextResponse.json({ error: lignesResult.error }, { status: 400 });
  }

  let dateEvenement: Date | null = null;
  if (body?.dateEvenement) {
    dateEvenement = new Date(body.dateEvenement);
    if (Number.isNaN(dateEvenement.getTime())) {
      return NextResponse.json({ error: "dateEvenement invalide." }, { status: 400 });
    }
  }

  let dureeMinutes: number | null = null;
  if (body?.dureeMinutes !== undefined && body?.dureeMinutes !== null) {
    const v = Number(body.dureeMinutes);
    if (!Number.isFinite(v) || v < 0) {
      return NextResponse.json({ error: "dureeMinutes invalide." }, { status: 400 });
    }
    dureeMinutes = v;
  }

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  }

  const montantTotal = lignesResult.lignes.reduce((sum, l) => sum + l.quantite * l.prixUnitaire, 0);

  const devis = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const numero = await generateNumero("DEVIS", tx);
    return tx.devis.create({
      data: {
        numero,
        clientId,
        origineManuelle: true,
        nbAdultes,
        nbEnfants,
        tarifAdulteApplique: 0,
        tarifEnfantApplique: 0,
        coutIndividuelTotal: montantTotal,
        montantAvantMajoration: montantTotal,
        montantTotal,
        tauxTVA: 0,
        acomptePourcentage: 0,
        acompteMontant: 0,
        acompteDelaiJours: 0,
        dateEvenement,
        dureeMinutes,
        notes: body?.notes || null,
        lignes: {
          create: lignesResult.lignes.map((l) => ({
            produitId: l.produitId,
            denomination: l.denomination,
            quantite: l.quantite,
            prixUnitaire: l.prixUnitaire,
            montantLigne: l.quantite * l.prixUnitaire,
            ordre: l.ordre,
          })),
        },
      },
      include: { lignes: true },
    });
  });

  return NextResponse.json({ devis }, { status: 201 });
}
