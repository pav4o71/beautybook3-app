-- Backfill default organization and location for existing single-tenant data.
INSERT INTO "Organization" ("id", "name", "slug", "timezone", "currency", "published", "createdAt", "updatedAt")
VALUES (
  'org_beautybook_demo',
  'BeautyBook Demo Salon',
  'beautybook-demo',
  'Asia/Manila',
  'PHP',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "Location" ("id", "organizationId", "name", "isDefault", "timezone", "active", "createdAt", "updatedAt")
SELECT
  'loc_beautybook_demo',
  o."id",
  'Main location',
  true,
  'Asia/Manila',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Organization" o
WHERE o."slug" = 'beautybook-demo'
ON CONFLICT DO NOTHING;

-- Ensure location exists (upsert by fixed id)
INSERT INTO "Location" ("id", "organizationId", "name", "isDefault", "timezone", "active", "createdAt", "updatedAt")
VALUES (
  'loc_beautybook_demo',
  (SELECT "id" FROM "Organization" WHERE "slug" = 'beautybook-demo'),
  'Main location',
  true,
  'Asia/Manila',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO UPDATE SET
  "organizationId" = EXCLUDED."organizationId",
  "name" = EXCLUDED."name",
  "isDefault" = EXCLUDED."isDefault";

UPDATE "ServiceCategory"
SET "organizationId" = (SELECT "id" FROM "Organization" WHERE "slug" = 'beautybook-demo')
WHERE "organizationId" IS NULL;

UPDATE "Service" s
SET "organizationId" = c."organizationId"
FROM "ServiceCategory" c
WHERE s."categoryId" = c."id" AND s."organizationId" IS NULL;

UPDATE "Staff"
SET
  "organizationId" = (SELECT "id" FROM "Organization" WHERE "slug" = 'beautybook-demo'),
  "locationId" = 'loc_beautybook_demo'
WHERE "organizationId" IS NULL;

UPDATE "StaffSchedule" ss
SET
  "organizationId" = st."organizationId",
  "locationId" = st."locationId"
FROM "Staff" st
WHERE ss."staffId" = st."id" AND ss."organizationId" IS NULL;

UPDATE "TimeOff" t
SET
  "organizationId" = st."organizationId",
  "locationId" = st."locationId"
FROM "Staff" st
WHERE t."staffId" = st."id" AND t."organizationId" IS NULL;

UPDATE "Appointment" a
SET
  "organizationId" = st."organizationId",
  "locationId" = st."locationId"
FROM "Staff" st
WHERE a."staffId" = st."id" AND a."organizationId" IS NULL;

-- Demo admin → OWNER, demo customer → MEMBER (if users exist)
INSERT INTO "OrganizationMember" ("id", "organizationId", "userId", "role", "createdAt", "updatedAt")
SELECT
  'om_admin_' || u."id",
  o."id",
  u."id",
  'OWNER'::"OrgRole",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "user" u
CROSS JOIN "Organization" o
WHERE u."email" = 'demo@beautybook.local' AND o."slug" = 'beautybook-demo'
ON CONFLICT ("organizationId", "userId") DO UPDATE SET "role" = 'OWNER'::"OrgRole";

INSERT INTO "OrganizationMember" ("id", "organizationId", "userId", "role", "createdAt", "updatedAt")
SELECT
  'om_customer_' || u."id",
  o."id",
  u."id",
  'MEMBER'::"OrgRole",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "user" u
CROSS JOIN "Organization" o
WHERE u."email" = 'customer@beautybook.local' AND o."slug" = 'beautybook-demo'
ON CONFLICT ("organizationId", "userId") DO NOTHING;

-- Replace global category slug unique with per-organization unique
DROP INDEX IF EXISTS "ServiceCategory_slug_key";
CREATE UNIQUE INDEX "ServiceCategory_organizationId_slug_key" ON "ServiceCategory"("organizationId", "slug");

-- Enforce NOT NULL
ALTER TABLE "ServiceCategory" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Service" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Staff" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Staff" ALTER COLUMN "locationId" SET NOT NULL;
ALTER TABLE "StaffSchedule" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "StaffSchedule" ALTER COLUMN "locationId" SET NOT NULL;
ALTER TABLE "TimeOff" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "TimeOff" ALTER COLUMN "locationId" SET NOT NULL;
ALTER TABLE "Appointment" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Appointment" ALTER COLUMN "locationId" SET NOT NULL;
