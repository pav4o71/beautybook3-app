-- AlterTable
ALTER TABLE "Location" ADD COLUMN "city" TEXT DEFAULT 'Manila';

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "photoLimit" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Organization" ADD COLUMN "listingTheme" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Organization" ADD COLUMN "storefrontLayout" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Organization" ADD COLUMN "listingPresets" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "ListingPhoto" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingPhoto_organizationId_sortOrder_idx" ON "ListingPhoto"("organizationId", "sortOrder");

-- AddForeignKey
ALTER TABLE "ListingPhoto" ADD CONSTRAINT "ListingPhoto_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill photo limits by tier
UPDATE "Organization" SET "photoLimit" = 6 WHERE "listingTier" = 'PREMIUM';
UPDATE "Organization" SET "photoLimit" = 1 WHERE "listingTier" = 'STANDARD';

-- Backfill ListingPhoto from coverImageUrl and galleryUrls
INSERT INTO "ListingPhoto" ("id", "organizationId", "url", "sortOrder", "createdAt")
SELECT
  gen_random_uuid()::text,
  o."id",
  o."coverImageUrl",
  0,
  NOW()
FROM "Organization" o
WHERE o."coverImageUrl" IS NOT NULL AND o."coverImageUrl" != '';

INSERT INTO "ListingPhoto" ("id", "organizationId", "url", "sortOrder", "createdAt")
SELECT
  gen_random_uuid()::text,
  o."id",
  elem::text,
  (idx + 1),
  NOW()
FROM "Organization" o,
LATERAL jsonb_array_elements_text(o."galleryUrls") WITH ORDINALITY AS t(elem, idx)
WHERE jsonb_typeof(o."galleryUrls") = 'array'
  AND elem::text != ''
  AND elem::text IS DISTINCT FROM o."coverImageUrl";
