-- CreateEnum
CREATE TYPE "BlocEmplacement" AS ENUM ('ACCUEIL', 'SITE_ENTIER');

-- CreateEnum
CREATE TYPE "BlocType" AS ENUM ('TEXTE', 'TEXTE_IMAGE', 'ENCART');

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "sonAmbianceNom" TEXT,
ADD COLUMN     "sonAmbianceUrl" TEXT;

-- CreateTable
CREATE TABLE "BlocContenu" (
    "id" TEXT NOT NULL,
    "type" "BlocType" NOT NULL,
    "emplacement" "BlocEmplacement" NOT NULL,
    "titre" TEXT,
    "contenu" TEXT NOT NULL,
    "imageUrl" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlocContenu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoCarrousel" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "legende" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhotoCarrousel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BlocContenu_emplacement_actif_ordre_idx" ON "BlocContenu"("emplacement", "actif", "ordre");

-- CreateIndex
CREATE INDEX "PhotoCarrousel_actif_ordre_idx" ON "PhotoCarrousel"("actif", "ordre");
