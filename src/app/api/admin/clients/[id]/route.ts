import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      reservations: {
        include: { creneau: { include: { visite: true } } },
        orderBy: { createdAt: "desc" },
      },
      devis: { include: { facture: true }, orderBy: { createdAt: "desc" } },
      factures: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!client) {
    return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  }

  return NextResponse.json({ client });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as
    | {
        nomOuRaisonSociale?: string;
        email?: string;
        telephone?: string;
        adressePostale?: string;
        notes?: string;
      }
    | null;

  if (!body) {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  try {
    const client = await prisma.client.update({
      where: { id },
      data: {
        ...(body.nomOuRaisonSociale !== undefined
          ? { nomOuRaisonSociale: body.nomOuRaisonSociale.trim() }
          : {}),
        ...(body.email !== undefined ? { email: body.email.trim() } : {}),
        ...(body.telephone !== undefined ? { telephone: body.telephone.trim() || null } : {}),
        ...(body.adressePostale !== undefined
          ? { adressePostale: body.adressePostale.trim() || null }
          : {}),
        ...(body.notes !== undefined ? { notes: body.notes.trim() || null } : {}),
      },
    });
    return NextResponse.json({ client });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "Un client avec cet e-mail existe déjà." },
        { status: 400 }
      );
    }
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
