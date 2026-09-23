-- AlterTable
ALTER TABLE "Devis" ADD COLUMN     "dateEvenement" TIMESTAMP(3),
ADD COLUMN     "dureeMinutes" INTEGER,
ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "Facture" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "adresseSiege" TEXT,
ADD COLUMN     "cgvTexte" TEXT,
ADD COLUMN     "emailContact" TEXT,
ADD COLUMN     "raisonSociale" TEXT,
ADD COLUMN     "siret" TEXT,
ADD COLUMN     "telephoneContact" TEXT;

-- CreateTable
CREATE TABLE "Produit" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "prixUnitaire" DECIMAL(10,2) NOT NULL,
    "dureeMinutes" INTEGER,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "visiteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Produit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevisLigne" (
    "id" TEXT NOT NULL,
    "devisId" TEXT NOT NULL,
    "produitId" TEXT,
    "denomination" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "prixUnitaire" DECIMAL(10,2) NOT NULL,
    "montantLigne" DECIMAL(10,2) NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DevisLigne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactureLigne" (
    "id" TEXT NOT NULL,
    "factureId" TEXT NOT NULL,
    "produitId" TEXT,
    "denomination" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "prixUnitaire" DECIMAL(10,2) NOT NULL,
    "montantLigne" DECIMAL(10,2) NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FactureLigne_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DevisLigne_devisId_idx" ON "DevisLigne"("devisId");

-- CreateIndex
CREATE INDEX "FactureLigne_factureId_idx" ON "FactureLigne"("factureId");

-- AddForeignKey
ALTER TABLE "Produit" ADD CONSTRAINT "Produit_visiteId_fkey" FOREIGN KEY ("visiteId") REFERENCES "Visite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevisLigne" ADD CONSTRAINT "DevisLigne_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevisLigne" ADD CONSTRAINT "DevisLigne_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "Produit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactureLigne" ADD CONSTRAINT "FactureLigne_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactureLigne" ADD CONSTRAINT "FactureLigne_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "Produit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
