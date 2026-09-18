import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

// The UI may only ever toggle between PUBLIE and MASQUE. RESERVE is set
// exclusively by the booking flow (src/app/api/reservations/**, out of
// scope here) and must never be reachable from this admin endpoint.
const patchSchema = z.object({
  status: z.enum(["PUBLIE", "MASQUE"]),
});

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.creneau.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Créneau introuvable." }, { status: 404 });
  }
  if (existing.status === "RESERVE") {
    return NextResponse.json(
      {
        error: {
          formErrors: ["Ce créneau est réservé : son statut ne peut pas être modifié depuis le back-office."],
          fieldErrors: {},
        },
      },
      { status: 409 }
    );
  }

  const updated = await prisma.creneau.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json({ creneau: updated });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.creneau.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Créneau introuvable." }, { status: 404 });
  }
  if (existing.status === "RESERVE") {
    return NextResponse.json(
      {
        error: {
          formErrors: ["Ce créneau est réservé et ne peut pas être supprimé."],
          fieldErrors: {},
        },
      },
      { status: 409 }
    );
  }

  await prisma.creneau.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
