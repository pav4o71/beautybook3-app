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

## 2. Mixed Table Ownership & Permission Diagnosis (Supabase Pitfall)

If migrations are executed across different connection endpoints (for example, applying initial migrations via direct `postgres` and subsequent migrations via a Supavisor connection pooler role such as `beautybook_prisma`), tables in the `public` schema may end up owned by different PostgreSQL roles.

When a later migration adds cross-table foreign keys (e.g., migrations 4 and 5 referencing `Organization` and `Location`), PostgreSQL requires `REFERENCES` privilege on the referenced table. If the connecting role does not own the target table or have explicit `REFERENCES` privileges granted by the owner, the migration fails with:
`ERROR: permission denied for table Organization` or `must be owner of table`.

### Step 1: Diagnose Object Ownership and Roles

Never assume role names or ownership blindly. In the Supabase SQL Editor, inspect actual table ownership:

```sql
SELECT schemaname, tablename, tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Inspect the actual database roles present in PostgreSQL:

```sql
SELECT rolname
FROM pg_roles
ORDER BY rolname;
```

> [!IMPORTANT]
> **Supavisor Username vs PostgreSQL Role Name:**
> Supavisor pooler connection strings use the syntax `[DB-USER].[PROJECT-REF]` (e.g. `beautybook_prisma.abcdefghijklmnop`). The `.[PROJECT-REF]` suffix is part of Supavisor's connection routing convention. The actual internal PostgreSQL role defined in `pg_roles` is typically `beautybook_prisma` (without the project ref suffix).
> **Never copy a pooler connection username string directly into SQL DDL or ownership commands.** Always verify the actual role name from `pg_roles`.

### Step 2: Targeted Remediation (Preferred)

Permissions on a PostgreSQL table can only be granted by the object's owner or a role with sufficient authorization (on hosted Supabase, `postgres` is `NOSUPERUSER` and cannot grant permissions on objects it does not own).

Execute targeted grants in the Supabase SQL Editor under the owner role context (or after switching to the owner role via `SET ROLE <actual_owner_role>;`):

```sql
-- Grant necessary references and access on tenancy tables to postgres
GRANT REFERENCES ON TABLE "Organization" TO postgres;
GRANT REFERENCES ON TABLE "Location" TO postgres;
GRANT ALL ON TABLE "Organization" TO postgres;
GRANT ALL ON TABLE "Location" TO postgres;
GRANT ALL ON TABLE "OrganizationMember" TO postgres;
GRANT USAGE ON TYPE "OrgRole" TO postgres;
```

After applying pending migration SQL in the SQL Editor, mark them applied locally:

```bash
npx prisma migrate resolve --applied 20260830100100_add_tenant_fks_nullable
npx prisma migrate resolve --applied 20260830100200_backfill_tenant_data
npx prisma migrate status
```

### Step 3: Ownership Normalization (When Genuinely Required)

If ownership normalization across all tables is required:
- Do **not** run broad `REASSIGN OWNED` commands blindly without verifying the target role and the scope of affected objects.
- Inspect the exact owner role name from `pg_tables` and `pg_roles`.
- If appropriate, reassign only the specific verified role's objects to `postgres`:
  ```sql
  -- Run only after confirming <actual_owner_role> exists in pg_roles
  REASSIGN OWNED BY "<actual_owner_role>" TO postgres;
  ```
- Targeted remediation (Step 2) is always preferred over blanket reassignment.

### Prevention (Best Practice)
When running DDL migrations against hosted Supabase, connect via the **direct** connection URI on port 5432 using the primary `postgres` role (`db.[REF].supabase.co:5432`), ensuring all database objects share a single owner. Note that on direct connections the database user is `postgres` (unlike the connection pooler which requires `postgres.[PROJECT-REF]`).

---

## 3. Standard Migration Deployment Procedure

### Recommended Workflow: Direct Connection
1. Retrieve the direct connection URI from the Supabase Dashboard (`Project Settings → Database → Connection string → URI`, port 5432).
2. Set the environment variable temporarily (note the username is `postgres`, not `postgres.[PROJECT-REF]`):
   ```bash
   export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
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
