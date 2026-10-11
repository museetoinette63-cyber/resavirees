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

function dateOuNull(valeur: unknown): Date | null | undefined {
  if (valeur === undefined) return undefined;
  if (valeur === null || valeur === "") return null;
  const d = new Date(String(valeur));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * Édition d'une facture : tous les champs sont modifiables, y compris pour
 * une facture issue d'une réservation. La date/durée de la prestation et
 * l'acompte s'affichent sur la facture mais sont portés par le devis lié :
 * ils sont mis à jour sur ce devis dans la même transaction. Le montant final
 * est TOUJOURS recalculé côté serveur à partir des lignes. Aucune de ces
 * modifications ne change le statut de la réservation liée.
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
        clientId?: string | null;
        nbAdultesReel?: number;
        nbEnfantsReel?: number;
        montantFinal?: number;
        lignes?: LigneInput[];
        notes?: string | null;
        soldeStatutPaiement?: "EN_ATTENTE" | "RECU" | "EXPIRE";
        soldeDateReglement?: string | null;
        soldeReferenceReglement?: string | null;
        noteLitige?: string | null;
        dateEvenement?: string | null;
        dureeMinutes?: number | null;
        acompteMontant?: number;
        acompteStatutPaiement?: "EN_ATTENTE" | "RECU" | "EXPIRE";
        acompteDateReglement?: string | null;
        acompteReferenceReglement?: string | null;
        destinataire?: unknown;
      }
    | null;
  if (!body || typeof body !== "object") {
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
  const devisData: Record<string, unknown> = {};

  if (body.noteLitige !== undefined) {
    data.noteLitige = body.noteLitige || null;
  }
  if (body.notes !== undefined) {
    data.notes = body.notes || null;
  }

  if (body.clientId !== undefined) {
    if (!body.clientId) {
      data.clientId = null;
    } else {
      const client = await prisma.client.findUnique({ where: { id: body.clientId } });
      if (!client) {
        return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
      }
      data.clientId = client.id;
    }
  }

  if (body.nbAdultesReel !== undefined) {
    const v = Number(body.nbAdultesReel);
    if (!Number.isFinite(v) || v < 0) {
      return NextResponse.json({ error: "nbAdultesReel invalide." }, { status: 400 });
    }
    data.nbAdultesReel = v;
  }
  if (body.nbEnfantsReel !== undefined) {
    const v = Number(body.nbEnfantsReel);
    if (!Number.isFinite(v) || v < 0) {
      return NextResponse.json({ error: "nbEnfantsReel invalide." }, { status: 400 });
    }
    data.nbEnfantsReel = v;
  }

  let lignesResult: ReturnType<typeof validateLignes> | null = null;
  if (body.lignes !== undefined) {
    lignesResult = validateLignes(body.lignes);
    if (!lignesResult.ok) {
      return NextResponse.json({ error: lignesResult.error }, { status: 400 });
    }
    data.montantFinal = arrondi(lignesResult.lignes.reduce((sum, l) => sum + l.quantite * l.prixUnitaire, 0));
    data.ajuste = true;
    data.ajusteLe = new Date();
    data.ajustePar = session.user.email;
  } else if (body.montantFinal !== undefined) {
    const v = Number(body.montantFinal);
    if (!Number.isFinite(v) || v < 0) {
      return NextResponse.json({ error: "montantFinal invalide." }, { status: 400 });
    }
    data.montantFinal = arrondi(v);
    data.ajuste = true;
    data.ajusteLe = new Date();
    data.ajustePar = session.user.email;
  }

  // --- Solde de la facture -----------------------------------------------
  if (body.soldeDateReglement !== undefined) {
    const d = dateOuNull(body.soldeDateReglement);
    if (d === undefined) {
      return NextResponse.json({ error: "Date de règlement du solde invalide." }, { status: 400 });
    }
    data.soldeDateReglement = d;
  }
  if (body.soldeReferenceReglement !== undefined) {
    data.soldeReferenceReglement = body.soldeReferenceReglement || null;
  }
  if (body.soldeStatutPaiement !== undefined) {
    data.soldeStatutPaiement = body.soldeStatutPaiement;
    if (body.soldeStatutPaiement === "RECU") {
      if (data.soldeDateReglement === undefined && !facture.soldeDateReglement) {
        data.soldeDateReglement = new Date();
      }
    } else {
      data.soldeDateReglement = null;
      data.soldeReferenceReglement = null;
    }
  }

  // --- Champs portés par le devis lié (affichés sur la facture) ----------
  if (body.dateEvenement !== undefined) {
    const d = dateOuNull(body.dateEvenement);
    if (d === undefined) {
      return NextResponse.json({ error: "dateEvenement invalide." }, { status: 400 });
    }
    devisData.dateEvenement = d;
  }
  if (body.dureeMinutes !== undefined) {
    if (body.dureeMinutes === null) {
      devisData.dureeMinutes = null;
    } else {
      const v = Number(body.dureeMinutes);
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: "dureeMinutes invalide." }, { status: 400 });
      }
      devisData.dureeMinutes = v;
    }
  }
  if (body.acompteMontant !== undefined) {
    const v = Number(body.acompteMontant);
    if (!Number.isFinite(v) || v < 0) {
      return NextResponse.json({ error: "Le montant de l'acompte doit être positif." }, { status: 400 });
    }
    devisData.acompteMontant = arrondi(v);
  }
  if (body.acompteDateReglement !== undefined) {
    const d = dateOuNull(body.acompteDateReglement);
    if (d === undefined) {
      return NextResponse.json({ error: "Date de règlement de l'acompte invalide." }, { status: 400 });
    }
    devisData.acompteDateReglement = d;
  }
  if (body.acompteReferenceReglement !== undefined) {
    devisData.acompteReferenceReglement = body.acompteReferenceReglement || null;
  }
  if (body.acompteStatutPaiement !== undefined) {
    devisData.acompteStatutPaiement = body.acompteStatutPaiement;
    if (body.acompteStatutPaiement === "RECU") {
      if (devisData.acompteDateReglement === undefined && !facture.devis.acompteDateReglement) {
        devisData.acompteDateReglement = new Date();
      }
    } else {
      devisData.acompteDateReglement = null;
      devisData.acompteReferenceReglement = null;
    }
  }

  try {
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
      if (Object.keys(devisData).length > 0) {
        await tx.devis.update({ where: { id: facture.devisId }, data: devisData });
      }
      const resultat = await tx.facture.update({
        where: { id },
        data,
        include: { lignes: { orderBy: { ordre: "asc" } } },
      });
      if (destinataire) {
        const clientFacture = data.clientId !== undefined ? (data.clientId as string | null) : facture.clientId;
        await appliquerDestinataire(
          tx,
          {
            clientId: clientFacture ?? facture.devis.clientId,
            reservationId: facture.devis.reservationId,
          },
          destinataire
        );
      }
      return resultat;
    });

    return NextResponse.json({ facture: updated });
  } catch (err) {
    if (err instanceof ErreurDestinataire) {
      return NextResponse.json({ error: err.message }, { status: err.statut });
    }
    throw err;
  }
}
