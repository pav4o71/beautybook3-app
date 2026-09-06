# BeautyBook

Multi-tenant salon booking SaaS and consumer marketplace for Metro Manila: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Prisma 7 + PostgreSQL (hosted Supabase or local Postgres), and Better Auth (email/password). Offline pay-at-salon model (no payment gateway tables).

For comprehensive technical specifications and data models, see [`docs/architecture.md`](./docs/architecture.md).

---

## Stack & Components

| Piece | Tool | Notes |
|---|---|---|
| **Framework** | Next.js 16.3.3 (App Router) | Server Components default; Server Actions for mutations |
| **Database** | PostgreSQL (Supabase or Docker) | Storage only — Supabase Auth is not used |
| **Schema & ORM** | Prisma 7.10.0 (`@prisma/adapter-pg`) | `prisma/schema.prisma` + `prisma/migrations/` |
| **Authentication** | Better Auth 1.7.2 | `/api/auth/*`; passwords hashed on `Account.password` |
| **Styling** | Tailwind CSS v4 | CSS-first configuration via `app/globals.css` |
| **Overlap Protection** | Postgres exclusion constraint | `Appointment_staff_no_overlap` (`btree_gist` migration) |
| **Partial Indexes** | Prisma partial unique index | `Location_one_default_per_org` (at most one default location per org) |

---

## Environment & Setup

Copy the environment template:

```bash
cp .env.example .env
```

Set `BETTER_AUTH_SECRET` (long random string) and `BETTER_AUTH_URL` (`http://localhost:3000` in local dev).

### 1. Hosted Supabase (Application Runtime)
To run the application against hosted Supabase:
1. Set `DATABASE_URL` to the Supabase **session pooler** URI (port **5432**, host `*.pooler.supabase.com`) using the `beautybook_prisma.[PROJECT-REF]` user or your pooler user. (Do not use Transaction mode port 6543 for app runtime).
2. Install dependencies and generate the Prisma Client:
   ```bash
   npm install
   npx prisma generate
   ```
3. Deploy migrations to hosted Supabase:
   ```bash
   npx prisma migrate deploy
   ```
   *(See [`docs/supabase-migration-runbook.md`](./docs/supabase-migration-runbook.md) for table ownership caveats if pooler DDL limits are encountered).*

> [!WARNING]
> **Do NOT run `npm run prisma:seed`, `npm run verify`, or `npm run test:e2e` against hosted Supabase.**
> Mutating test, seed, and verify commands enforce a fail-closed guard (`lib/test-only-local-db.ts`) and **refuse** any database that is not an approved local test/dev database (`localhost` / `127.0.0.1`). There is no remote bypass.

### 2. Local PostgreSQL (Development, Seeding & Tests)
For local development, automated verification, and E2E testing, use a local PostgreSQL container:

```bash
# Start local Postgres container on port 5433
docker run -d --name beautybook3-pg \
  -e POSTGRES_USER=beautybook \
  -e POSTGRES_PASSWORD=beautybook \
  -e POSTGRES_DB=beautybook \
  -p 5433:5432 \
  postgres:16

# Point DATABASE_URL to local instance
export DATABASE_URL="postgresql://beautybook:beautybook@localhost:5433/beautybook?sslmode=disable"

# Deploy migrations and seed demo data
npx prisma migrate deploy
npm run prisma:seed
```

---

## Demo Accounts

All demo accounts use password: `Demo1234!`

| Role | Email | Scope |
|---|---|---|
| **Admin / Owner** | `demo@beautybook.local` | `OrgRole.OWNER` for Demo Salon |
| **Customer** | `customer@beautybook.local` | Customer member in Demo Salon |
| **Owner (Glow)** | `owner@glow-nails.local` | `OrgRole.OWNER` for Glow Nails Studio |
| **Owner (Luxe)** | `owner@luxe-hair.local` | `OrgRole.OWNER` for Luxe Hair Lounge |

---

## Development & Testing

Start the local development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in at `/login`.

### Verify Suite (`npm run verify`)
Runs `scripts/verify/run-all.ts`, executing **all 11 verification checks** against a local database:
1. `format.ts` — Price (PHP) and time formatting validation
2. `local-db-guard.ts` — Verifies database safety guards reject unsafe URLs
3. `seed-counts.ts` — Asserts minimum seeded counts across tenants
4. `areas.ts` — Verifies Manila areas list and filtering
5. `marketplace-search.ts` — Tests category and service queries
6. `marketplace-availability.ts` — Tests cross-org availability searches
7. `org-scope.ts` — Asserts tenant isolation between demo and extra organizations
8. `org-roles.ts` — Asserts role rank hierarchy and permission checks
9. `slots.ts` — Verifies slot generation against staff schedules
10. `booking.ts` — Tests multi-service booking, limits, and validation
11. `appointments.ts` — Tests appointment status transitions and admin board

```bash
# Requires an approved local database (e.g. localhost:5433 / beautybook)
npm run verify
```

### End-to-End Tests (`npm run test:e2e`)
Runs the full Playwright suite (**34 tests** across 11 spec files). `e2e/global-setup.ts` seeds the database before execution:

```bash
npm run test:e2e
```

---

## Key Routes & Flow

### Public Marketplace & Storefront
- **`/` (Canonical Marketplace):** Service-first discovery ("What would you like to book?"). Supports category chips, service chips, Manila area filter (14 areas defined in `lib/areas.ts`), date and preferred time filters, quick availability pills (`today`, `tomorrow`, `weekend`, `open`, `earliest`), sticky booking CTA, trust rows, and next-available badges.
  - **"Book now"** CTA deep-links to `/s/{slug}/book?serviceId=...` (or falls back to `/s/{slug}#services` if no bookable service is found; `BusinessCard` does not add `locationId`).
  - **"View salon"** link opens `/s/{slug}` (preserving the selected service-name query parameter when one exists).
- **`/search` & `/marketplace`:** Permanent redirects (`HTTP 308`) to `/?${qs}` or `/` (whitelists `category`, `service`, `area`, `date`, `time`, `serviceId`; drops unhandled params such as `avail`).
- **`/s/{orgSlug}`:** Salon storefront displaying about information, contact phone, cover image, branch locations with opening hours, and multi-service cart (`ServicePicker`).
- **`/s/{orgSlug}/book`:** Public booking page. Works for both anonymous guests and logged-in customers. Multi-service booking (up to 6 services, max 240 minutes) with staff filtering by branch capability.

### Authenticated & Member Routes
- **`/onboarding`:** Create a new business organization (authenticated users without memberships).
- **`/dashboard`:** Member home and active organization context.
- **`/dashboard/book`:** Member booking form using active organization context.
- **`/dashboard/appointments`:** Customer's upcoming and recent appointments (pay-at-salon status copy; cancellation/rescheduling is handled offline with the salon).
- **`/dashboard/services` & `/dashboard/staff`:** Customer view of active salon services and staff.

### Organization Admin (`/dashboard/admin/*`)
Gated strictly by active `OrgRole` (`OWNER` or `ADMIN`).
- **`/dashboard/admin`:** Admin summary dashboard.
- **`/dashboard/admin/appointments`:** Today's appointment board (mark completed, no-show, or cancel; appointments are confirmed upon creation).
- **`/dashboard/admin/services`:** Catalog management (create/edit services, PHP pricing, active status).
- **`/dashboard/admin/categories`:** Service categories CRUD.
- **`/dashboard/admin/locations`:** Branch location management (enforces at most one default location per organization).
- **`/dashboard/admin/staff`:** Staff management, location assignment, service capabilities, schedules, and time off.
- **`/dashboard/admin/settings`:** Business profile (name, slug, description, phone, cover image URL, published toggle).

---

## Authentication & Authorization

```ts
import { requireUser } from "@/lib/require-user";
import { requireActiveOrgContext, requireActiveOrgAdmin, requireOrgMember } from "@/lib/require-org";
import { requireAdmin } from "@/lib/require-admin";
```

- **`requireUser()`**: Validates active session; redirects unauthenticated users to `/login`.
- **`requireOrgMember(orgId, minimumRole?)`**: Validates membership and role rank in a specific organization.
- **`requireActiveOrgContext()`**: Resolves active organization and location via cookies or memberships.
- **`requireActiveOrgAdmin()`**: Resolves active organization and strictly verifies `isOrgAdminRole(membership.role)` (`OWNER` or `ADMIN`). Redirects non-admins to `/dashboard`.
- **`requireAdmin()`**: Alias for `requireActiveOrgAdmin()`.

> [!NOTE]
> `User.role === ADMIN` is legacy single-salon MVP state and does **not** grant access to organization admin routes. Admin access is strictly governed by `OrgRole` in `OrganizationMember`.

---

## Database Migrations (Canonical Main)

There are **9 migrations** under `prisma/migrations/`:
1. `20260829224926_init_auth_and_booking` — Initial auth, user, and single-salon booking schema.
2. `20260830034500_appointment_staff_no_overlap` — Enables `btree_gist` extension and adds staff appointment non-overlap exclusion constraint.
3. `20260830100000_add_tenancy_tables` — Adds `Organization`, `Location`, `OrganizationMember`, and `OrgRole`.
4. `20260830100100_add_tenant_fks_nullable` — Adds nullable tenant foreign keys across catalog and appointments.
5. `20260830100200_backfill_tenant_data` — Backfills demo organization data and enforces `NOT NULL`.
6. `20260830133632_add_location_area` — Adds `Location.area` for Metro Manila area filtering.
7. `20260830172000_add_organization_cover_image` — Adds `Organization.coverImageUrl`.
8. `20260830183000_salon_profile_and_appointment_service_unique` — Adds salon profile fields and unique constraint on `AppointmentService(appointmentId, serviceId)`.
9. `20260903120000_location_one_default_and_org_published_idx` — Enforces partial unique index `Location_one_default_per_org` (**at most one default location per organization**) and index on `Organization(published)`.

Use `npx prisma migrate deploy` for deploying migrations in production and testing environments.

---

## References

- Canonical Architecture: [`docs/architecture.md`](./docs/architecture.md)
- Hosted Migration Runbook: [`docs/supabase-migration-runbook.md`](./docs/supabase-migration-runbook.md)
- Next Steps & Backlog: [`docs/saas-next-steps.md`](./docs/saas-next-steps.md)
- Product Roadmap: [`docs/beautybook-improvement-roadmap.md`](./docs/beautybook-improvement-roadmap.md)
