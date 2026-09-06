# Supabase Migration Runbook (Hosted DB)

**Canonical Reference:** Database Operations & Hosted Migration Deployment
**Companion Documents:** [`README.md`](../README.md), [`docs/architecture.md`](./architecture.md)

Use this runbook when applying Prisma migrations to hosted Supabase, or troubleshooting table ownership and DDL limitations on the session pooler.

---

## 1. Canonical Migration Inventory

There are **9 migrations** under `prisma/migrations/`. All migrations must be applied in sequential order.

| # | Migration Directory | Scope & Constraints | Hosted Deployment Caveats |
|---|---|---|---|
| 1 | `20260829224926_init_auth_and_booking` | Initial auth, user, and single-salon booking schema | Applies normally |
| 2 | `20260830034500_appointment_staff_no_overlap` | Enables `btree_gist` extension; adds staff appointment exclusion constraint `Appointment_staff_no_overlap` | One-time cleanup deletes newer row in overlapping active appointments |
| 3 | `20260830100000_add_tenancy_tables` | Adds `Organization`, `Location`, `OrganizationMember`, `OrgRole` enum | Applies normally |
| 4 | `20260830100100_add_tenant_fks_nullable` | Adds nullable tenant foreign keys across catalog and appointments | Requires table ownership grants if mixed roles exist (see below) |
| 5 | `20260830100200_backfill_tenant_data` | Backfills `beautybook-demo` tenant data; enforces `NOT NULL` constraints | Requires table ownership grants if mixed roles exist (see below) |
| 6 | `20260830133632_add_location_area` | Adds `Location.area` column and index for Metro Manila area filtering | Applies normally |
| 7 | `20260830172000_add_organization_cover_image` | Adds `Organization.coverImageUrl` | Applies normally |
| 8 | `20260830183000_salon_profile_and_appointment_service_unique` | Adds `Organization.description`/`phone`, `Location.phone`; adds unique constraint on `AppointmentService(appointmentId, serviceId)` | Deletes duplicate join rows, keeping the lowest id |
| 9 | `20260903120000_location_one_default_and_org_published_idx` | Enforces partial unique index `Location_one_default_per_org` (**at most one default location per organization**) and index on `Organization(published)` | Cleans up duplicate defaults per org before creating index |

---

## 2. Mixed Table Ownership (Supabase Pitfall)

If migration 3 (`20260830100000_add_tenancy_tables`) was executed via the **session pooler** user (`beautybook_prisma.[REF]`), the newly created tenancy tables (`Organization`, `Location`, `OrganizationMember`) are owned by `beautybook_prisma`, while legacy tables are owned by `postgres`.

Subsequent cross-table foreign key migrations (migrations 4 and 5) will then fail with:
`ERROR: permission denied for table Organization` or `must be owner of table`.

### Resolution
Execute the following grant statements in the Supabase SQL Editor (as `postgres`):

```sql
-- Grant permissions across roles
GRANT REFERENCES ON TABLE "Organization" TO postgres;
GRANT REFERENCES ON TABLE "Location" TO postgres;
GRANT ALL ON TABLE "Organization" TO postgres;
GRANT ALL ON TABLE "Location" TO postgres;
GRANT ALL ON TABLE "OrganizationMember" TO postgres;
GRANT USAGE ON TYPE "OrgRole" TO postgres;
```

After running the SQL in the editor, resolve the migration status on your local terminal:

```bash
npx prisma migrate resolve --applied 20260830100100_add_tenant_fks_nullable
npx prisma migrate resolve --applied 20260830100200_backfill_tenant_data
npx prisma migrate status
```

### Prevention (Best Practice)
When running DDL migrations against hosted Supabase, connect via the **direct** connection URI on port 5432 using the primary `postgres` role (`db.[REF].supabase.co:5432`), ensuring all database objects share a single owner.

---

## 3. Standard Migration Deployment Procedure

### Recommended Workflow: Direct Connection
1. Retrieve the direct connection URI from the Supabase Dashboard (`Project Settings → Database → Connection string → URI`, port 5432).
2. Set the environment variable temporarily:
   ```bash
   export DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
   ```
3. Deploy migrations:
   ```bash
   npx prisma migrate deploy
   ```
4. Verify migration state:
   ```bash
   npx prisma migrate status
   ```
5. Revert `DATABASE_URL` to the session pooler URI for application runtime (`*.pooler.supabase.com:5432`).

---

## 4. Test & Verification Safety Guards

> [!CAUTION]
> **Never run mutating tests or seed scripts against hosted Supabase.**
> `npm run prisma:seed` and `npm run verify` enforce `assertLocalOnlyDatabase()` (`lib/test-only-local-db.ts`).
> They will immediately terminate if `DATABASE_URL` does not point to an approved local loopback host (`localhost`, `127.0.0.1`, `[::1]`).
> There is **no remote bypass** (`VERIFY_ALLOW_REMOTE` does not exist).

To verify the hosted database after migrations:
1. Inspect `_prisma_migrations` in the Supabase Dashboard Table Editor to verify all 9 migrations have `finished_at IS NOT NULL`.
2. Start the application locally against the pooler URI (`npm run dev`) and spot-check public and admin pages in the browser.
