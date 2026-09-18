import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clients = await prisma.client.findMany({
    orderBy: { nomOuRaisonSociale: "asc" },
    include: { _count: { select: { reservations: true } } },
  });

  return NextResponse.json({ clients });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        nomOuRaisonSociale?: string;
        email?: string;
        telephone?: string;
        adressePostale?: string;
        notes?: string;
      }
    | null;

  if (!body?.nomOuRaisonSociale?.trim() || !body?.email?.trim()) {
    return NextResponse.json(
      { error: "Nom / raison sociale et e-mail sont requis." },
      { status: 400 }
    );
  }

  try {
    const client = await prisma.client.create({
      data: {
        nomOuRaisonSociale: body.nomOuRaisonSociale.trim(),
        email: body.email.trim(),
        telephone: body.telephone?.trim() || null,
        adressePostale: body.adressePostale?.trim() || null,
        notes: body.notes?.trim() || null,
      },
    });
    return NextResponse.json({ client }, { status: 201 });
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
