-- CreateEnum
CREATE TYPE "ListingTier" AS ENUM ('STANDARD', 'PREMIUM');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "listingTier" "ListingTier" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN "tagline" TEXT,
ADD COLUMN "logoUrl" TEXT,
ADD COLUMN "accentColor" TEXT,
ADD COLUMN "instagramUrl" TEXT,
ADD COLUMN "facebookUrl" TEXT,
ADD COLUMN "websiteUrl" TEXT,
ADD COLUMN "galleryUrls" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "featuredServiceId" TEXT;

-- CreateIndex
CREATE INDEX "Organization_listingTier_published_idx" ON "Organization"("listingTier", "published");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_featuredServiceId_fkey" FOREIGN KEY ("featuredServiceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
