-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "logosDocuments" TEXT[] DEFAULT ARRAY[]::TEXT[];
