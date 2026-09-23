import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateNumero } from "@/lib/numbering";
import type { PrismaTransactionClient } from "@/lib/reservationWorkflow/transitions";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const factures = await prisma.facture.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      client: true,
      devis: { include: { reservation: { include: { creneau: { include: { visite: true } } } } } },
    },
  });

  return NextResponse.json({ factures });
}

interface LigneInput {
  produitId?: string | null;
  denomination?: string;
  quantite?: number;
  prixUnitaire?: number;
}

/** Même validation que POST /api/admin/devis — au moins une ligne, valeurs positives. */
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

/**
 * Création manuelle d'une facture, à partir d'un devis existant sans
 * facture (cahier des charges §3.4). Le devis n'a pas besoin d'être manuel —
 * on garde la même contrainte que la route scoped-client existante : un
 * devis lié à une réservation est censé recevoir sa facture automatiquement
 * au passage à REALISE, donc en pratique cette création manuelle sert
 * surtout aux devis manuels, mais rien ne l'empêche techniquement.
 *
 * Les lignes sont fournies par le formulaire (pré-remplies depuis les
 * lignes du devis choisi côté client, mais librement modifiables avant
 * envoi) — le montant final est TOUJOURS recalculé côté serveur à partir de
 * ces lignes, jamais fait confiance à un total envoyé par le client.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        devisId?: string;
        lignes?: LigneInput[];
        nbAdultesReel?: number;
        nbEnfantsReel?: number;
        notes?: string | null;
      }
    | null;

  const devisId = body?.devisId;
  if (!devisId) {
    return NextResponse.json({ error: "Le devis est requis." }, { status: 400 });
  }

  const devis = await prisma.devis.findUnique({ where: { id: devisId }, include: { facture: true } });
  if (!devis) {
    return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
  }
  if (devis.facture) {
    return NextResponse.json({ error: "Ce devis a déjà une facture." }, { status: 400 });
  }

  const lignesResult = validateLignes(body?.lignes);
  if (!lignesResult.ok) {
    return NextResponse.json({ error: lignesResult.error }, { status: 400 });
  }

  const nbAdultesReel =
    body?.nbAdultesReel !== undefined ? Number(body.nbAdultesReel) : devis.nbAdultes;
  const nbEnfantsReel =
    body?.nbEnfantsReel !== undefined ? Number(body.nbEnfantsReel) : devis.nbEnfants;

  if (
    !Number.isFinite(nbAdultesReel) ||
    nbAdultesReel < 0 ||
    !Number.isFinite(nbEnfantsReel) ||
    nbEnfantsReel < 0
  ) {
    return NextResponse.json({ error: "Champs numériques invalides." }, { status: 400 });
  }

  const montantFinal = lignesResult.lignes.reduce((sum, l) => sum + l.quantite * l.prixUnitaire, 0);

  const facture = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const numero = await generateNumero("FACTURE", tx);
    return tx.facture.create({
      data: {
        numero,
        devisId: devis.id,
        clientId: devis.clientId,
        nbAdultesReel,
        nbEnfantsReel,
        montantFinal,
        tauxTVA: devis.tauxTVA,
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

  return NextResponse.json({ facture }, { status: 201 });
}
