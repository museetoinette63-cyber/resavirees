import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const settingsSchema = z.object({
  siteName: z.string().min(1).optional().nullable(),
  headerImageUrl: z.string().min(1).optional().nullable(),
  backgroundImageUrl: z.string().min(1).optional().nullable(),
  // Identité légale "expéditeur" + CGV affichées sur les devis/factures PDF
  // (voir prisma/schema.prisma SiteSettings). Pas de contrainte de format
  // stricte sur le SIRET : ce formulaire n'a pas à valider la structure
  // officielle, seulement à stocker ce que l'admin renseigne.
  raisonSociale: z.string().min(1).optional().nullable(),
  siret: z.string().min(1).optional().nullable(),
  adresseSiege: z.string().min(1).optional().nullable(),
  emailContact: z.string().email("Adresse email invalide.").optional().nullable(),
  telephoneContact: z.string().min(1).optional().nullable(),
  cgvTexte: z.string().min(1).optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = settingsSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const settings = await prisma.siteSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });

  return NextResponse.json({ settings });
}
