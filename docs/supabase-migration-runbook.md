# Supabase migration runbook (hosted DB)

Use this when `npx prisma migrate deploy` fails on the **session pooler** with errors like `must be owner of table` or `must be owner of index`.

## Current state (as of Phase 1)

| Migration | Local Postgres | Hosted Supabase |
|-----------|----------------|-----------------|
| `20260830100000_add_tenancy_tables` | Applied | Applied |
| `20260830100100_add_tenant_fks_nullable` | Applied | **Failed** (pooler DDL) |
| `20260830100200_backfill_tenant_data` | Applied | Not applied |

## Prerequisites

1. Supabase project dashboard access: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. **Direct** connection string (not pooler) for DDL — Supabase → Project Settings → Database → Connection string (URI, port 5432)
3. Or use **SQL Editor** (runs as owner) — preferred for one-off DDL

## Option A — SQL Editor (recommended)

1. Open SQL Editor in Supabase dashboard.
2. Run the SQL from each pending migration folder under `prisma/migrations/` in order:
   - `20260830100100_add_tenant_fks_nullable/migration.sql`
   - `20260830100200_backfill_tenant_data/migration.sql`
3. On your machine (with `DATABASE_URL` pointing at pooler):

```bash
npx prisma migrate resolve --applied 20260830100100_add_tenant_fks_nullable
npx prisma migrate resolve --applied 20260830100200_backfill_tenant_data
npx prisma migrate status   # should show all applied
```

4. Seed hosted DB (optional, careful in shared env):

```bash
export VERIFY_ALLOW_REMOTE=1   # only if running verify against hosted
npm run prisma:seed
```

## Option B — Direct connection migrate deploy

```bash
export DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
npx prisma migrate deploy
```

Switch back to pooler URI for app runtime (`*.pooler.supabase.com:5432`).

## Verify after migrate

```bash
export DATABASE_URL="<pooler-uri>"
export VERIFY_ALLOW_REMOTE=1
npm run verify
```

## Rollback

Do **not** drop tenant columns on production without a backup. If a migration partially applied, inspect `_prisma_migrations` and table state in SQL Editor before resolving.

## Cursor / MCP

Authenticate the Supabase MCP plugin in Cursor when prompted (`mcp_auth`) to run `execute_sql` / `apply_migration` without installing the CLI.
