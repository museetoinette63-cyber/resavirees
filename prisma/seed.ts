import bcrypt from "bcryptjs";

import { prisma } from "../src/lib/prisma";

// Idempotent seed: safe to re-run (`npx prisma db seed`) without
// duplicating rows — every model here is upserted on a natural unique key.
// Créneaux are the one exception (no natural unique key across
// visiteId+dateHeure in the schema): they're only created for a Visite that
// currently has none.

const HEURES_DEMO = ["14:00", "16:00"];
const NB_JOURS_DEMO = 10;

async function seedAdminUser() {
  const passwordHash = bcrypt.hashSync("changeme123", 10);

  await prisma.adminUser.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      passwordHash,
      nom: "Administrateur",
      role: "ADMIN",
      actif: true,
    },
  });
}

async function seedSiteSettings() {
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      siteName: "Visites Guidées Théâtralisées",
    },
  });
}

async function seedVisites() {
  const visiteChateau = await prisma.visite.upsert({
    where: { slug: "visite-theatralisee-du-chateau" },
    update: {},
    create: {
      nom: "Visite théâtralisée du château",
      slug: "visite-theatralisee-du-chateau",
      description:
        "Une déambulation costumée à travers les salles du château, ponctuée de saynètes jouées par nos comédiens.",
      visible: true,
      tarifAdulte: 15.0,
      tarifEnfant: 8.0,
      majorationTardiveMontant: 25.0,
      majorationTardiveDelaiHeures: 48,
      acomptePourcentage: 30,
      acompteDelaiJours: 30,
    },
  });

  const visiteChasse = await prisma.visite.upsert({
    where: { slug: "chasse-au-tresor-nocturne" },
    update: {},
    create: {
      nom: "Chasse au trésor nocturne",
      slug: "chasse-au-tresor-nocturne",
      description:
        "Une enquête grandeur nature à la tombée de la nuit, à la recherche d'un trésor caché dans les jardins historiques.",
      visible: true,
      tarifAdulte: 18.0,
      tarifEnfant: 10.0,
      majorationTardiveMontant: 25.0,
      majorationTardiveDelaiHeures: 48,
      acomptePourcentage: 30,
      acompteDelaiJours: 30,
    },
  });

  return { visiteChateau, visiteChasse };
}

async function seedReglesForfait(
  visiteChateauId: string,
  visiteChasseId: string
) {
  await prisma.regleForfait.upsert({
    where: {
      visiteId_niveau: { visiteId: visiteChateauId, niveau: "NIVEAU_1" },
    },
    update: {},
    create: {
      visiteId: visiteChateauId,
      niveau: "NIVEAU_1",
      seuilAdultes: 10,
      seuilEnfants: 10,
      montant: 120.0,
      actif: true,
    },
  });

  await prisma.regleForfait.upsert({
    where: {
      visiteId_niveau: { visiteId: visiteChasseId, niveau: "NIVEAU_1" },
    },
    update: {},
    create: {
      visiteId: visiteChasseId,
      niveau: "NIVEAU_1",
      seuilAdultes: 8,
      seuilEnfants: 8,
      montant: 150.0,
      actif: true,
    },
  });

  await prisma.regleForfait.upsert({
    where: {
      visiteId_niveau: { visiteId: visiteChasseId, niveau: "NIVEAU_2" },
    },
    update: {},
    create: {
      visiteId: visiteChasseId,
      niveau: "NIVEAU_2",
      seuilGlobal: 50,
      montant: 600.0,
      actif: true,
    },
  });
}

async function seedCreneauxPourVisite(visiteId: string) {
  const existingCount = await prisma.creneau.count({ where: { visiteId } });
  if (existingCount > 0) {
    return;
  }

  const today = new Date();
  const dates: Date[] = [];
  let dayOffset = 1;
  while (dates.length < NB_JOURS_DEMO) {
    const candidate = new Date(today);
    candidate.setDate(candidate.getDate() + dayOffset);
    // Spread across roughly the next 2 months, every ~5-6 days.
    dates.push(candidate);
    dayOffset += 6;
  }

  const data = dates.flatMap((date) =>
    HEURES_DEMO.map((heure) => {
      const [hours, minutes] = heure.split(":").map(Number);
      const dateHeure = new Date(date);
      dateHeure.setHours(hours, minutes, 0, 0);
      return {
        visiteId,
        dateHeure,
        status: "PUBLIE" as const,
      };
    })
  );

  await prisma.creneau.createMany({ data });
}

async function main() {
  try {
    await seedAdminUser();
    await seedSiteSettings();
    const { visiteChateau, visiteChasse } = await seedVisites();
    await seedReglesForfait(visiteChateau.id, visiteChasse.id);
    await seedCreneauxPourVisite(visiteChateau.id);
    await seedCreneauxPourVisite(visiteChasse.id);

    console.log("Seed terminé.");
    console.log("Admin: admin@example.com / changeme123");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
