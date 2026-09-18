-- CreateEnum
CREATE TYPE "NiveauForfait" AS ENUM ('NIVEAU_1', 'NIVEAU_2');

-- CreateEnum
CREATE TYPE "CreneauStatus" AS ENUM ('PUBLIE', 'RESERVE', 'MASQUE');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('DEMANDE_RECUE', 'DEVIS_INTERNE_GENERE', 'EN_ATTENTE_VALIDATION_ADMIN', 'DEVIS_VALIDE', 'DEVIS_ENVOYE', 'ACOMPTE_EN_ATTENTE', 'ACOMPTE_RECU', 'ACOMPTE_EXPIRE', 'CONFIRME', 'REALISE', 'FACTURE_AJUSTEE', 'FACTURE_ENVOYEE', 'SOLDE', 'ANNULE');

-- CreateEnum
CREATE TYPE "StatutPaiement" AS ENUM ('EN_ATTENTE', 'RECU', 'EXPIRE');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN');

-- CreateTable
CREATE TABLE "Visite" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageBanniereUrl" TEXT,
    "visible" BOOLEAN NOT NULL DEFAULT false,
    "tarifAdulte" DECIMAL(10,2) NOT NULL,
    "tarifEnfant" DECIMAL(10,2) NOT NULL,
    "majorationTardiveMontant" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "majorationTardiveDelaiHeures" INTEGER NOT NULL DEFAULT 48,
    "acomptePourcentage" DECIMAL(5,2) NOT NULL DEFAULT 30,
    "acompteDelaiJours" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegleForfait" (
    "id" TEXT NOT NULL,
    "visiteId" TEXT NOT NULL,
    "niveau" "NiveauForfait" NOT NULL,
    "seuilAdultes" INTEGER,
    "seuilEnfants" INTEGER,
    "seuilGlobal" INTEGER,
    "montant" DECIMAL(10,2) NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RegleForfait_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Creneau" (
    "id" TEXT NOT NULL,
    "visiteId" TEXT NOT NULL,
    "dateHeure" TIMESTAMP(3) NOT NULL,
    "status" "CreneauStatus" NOT NULL DEFAULT 'PUBLIE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Creneau_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "creneauId" TEXT NOT NULL,
    "clientId" TEXT,
    "nomOuRaisonSociale" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "adressePostale" TEXT NOT NULL,
    "nbAdultes" INTEGER NOT NULL,
    "nbEnfants" INTEGER NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'DEMANDE_RECUE',
    "notesAdmin" TEXT,
    "dateReservation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "googleEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservationStatusHistory" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "fromStatus" "ReservationStatus",
    "toStatus" "ReservationStatus" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" TEXT,
    "note" TEXT,

    CONSTRAINT "ReservationStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Devis" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "reservationId" TEXT,
    "clientId" TEXT,
    "origineManuelle" BOOLEAN NOT NULL DEFAULT false,
    "nbAdultes" INTEGER NOT NULL,
    "nbEnfants" INTEGER NOT NULL,
    "tarifAdulteApplique" DECIMAL(10,2) NOT NULL,
    "tarifEnfantApplique" DECIMAL(10,2) NOT NULL,
    "forfaitApplique" "NiveauForfait",
    "montantForfait" DECIMAL(10,2),
    "coutIndividuelTotal" DECIMAL(10,2) NOT NULL,
    "montantAvantMajoration" DECIMAL(10,2) NOT NULL,
    "majorationTardiveAppliquee" BOOLEAN NOT NULL DEFAULT false,
    "montantMajoration" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "montantTotal" DECIMAL(10,2) NOT NULL,
    "tauxTVA" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "acomptePourcentage" DECIMAL(5,2) NOT NULL,
    "acompteMontant" DECIMAL(10,2) NOT NULL,
    "acompteDelaiJours" INTEGER NOT NULL,
    "acompteDateLimite" TIMESTAMP(3),
    "acompteStatutPaiement" "StatutPaiement" NOT NULL DEFAULT 'EN_ATTENTE',
    "acompteDateReglement" TIMESTAMP(3),
    "acompteReferenceReglement" TEXT,
    "validePar" TEXT,
    "valideLe" TIMESTAMP(3),
    "envoyeLe" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Devis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facture" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "devisId" TEXT NOT NULL,
    "clientId" TEXT,
    "nbAdultesReel" INTEGER NOT NULL,
    "nbEnfantsReel" INTEGER NOT NULL,
    "montantFinal" DECIMAL(10,2) NOT NULL,
    "tauxTVA" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "ajuste" BOOLEAN NOT NULL DEFAULT false,
    "ajusteLe" TIMESTAMP(3),
    "ajustePar" TEXT,
    "soldeStatutPaiement" "StatutPaiement" NOT NULL DEFAULT 'EN_ATTENTE',
    "soldeDateReglement" TIMESTAMP(3),
    "soldeReferenceReglement" TEXT,
    "noteLitige" TEXT,
    "envoyeeLe" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "nomOuRaisonSociale" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "adressePostale" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nom" TEXT,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "siteName" TEXT,
    "headerImageUrl" TEXT,
    "backgroundImageUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NumberingCounter" (
    "id" TEXT NOT NULL,
    "seq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "NumberingCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Visite_slug_key" ON "Visite"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "RegleForfait_visiteId_niveau_key" ON "RegleForfait"("visiteId", "niveau");

-- CreateIndex
CREATE INDEX "Creneau_visiteId_dateHeure_idx" ON "Creneau"("visiteId", "dateHeure");

-- CreateIndex
CREATE INDEX "Creneau_status_idx" ON "Creneau"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_creneauId_key" ON "Reservation"("creneauId");

-- CreateIndex
CREATE INDEX "Reservation_status_idx" ON "Reservation"("status");

-- CreateIndex
CREATE INDEX "ReservationStatusHistory_reservationId_idx" ON "ReservationStatusHistory"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "Devis_numero_key" ON "Devis"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Devis_reservationId_key" ON "Devis"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "Facture_numero_key" ON "Facture"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Facture_devisId_key" ON "Facture"("devisId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_email_key" ON "Client"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- AddForeignKey
ALTER TABLE "RegleForfait" ADD CONSTRAINT "RegleForfait_visiteId_fkey" FOREIGN KEY ("visiteId") REFERENCES "Visite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Creneau" ADD CONSTRAINT "Creneau_visiteId_fkey" FOREIGN KEY ("visiteId") REFERENCES "Visite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_creneauId_fkey" FOREIGN KEY ("creneauId") REFERENCES "Creneau"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationStatusHistory" ADD CONSTRAINT "ReservationStatusHistory_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Devis" ADD CONSTRAINT "Devis_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Devis" ADD CONSTRAINT "Devis_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
