-- Keep a single default location per organization before the unique index.
UPDATE "Location" AS extra
SET "isDefault" = false
WHERE extra."isDefault" = true
  AND extra."id" <> (
    SELECT keep."id"
    FROM "Location" AS keep
    WHERE keep."organizationId" = extra."organizationId"
      AND keep."isDefault" = true
    ORDER BY keep."id"
    LIMIT 1
  );

-- CreateIndex
CREATE UNIQUE INDEX "Location_one_default_per_org" ON "Location"("organizationId") WHERE ("isDefault" = true);

-- CreateIndex
CREATE INDEX "Organization_published_idx" ON "Organization"("published");
