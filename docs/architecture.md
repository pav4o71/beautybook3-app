# BeautyBook Architecture & Technical Specifications

**Canonical Reference:** BeautyBook Multi-Tenant SaaS & Marketplace
**Audited Commit:** `b63bb8da66963c89db9f8c6a621802ce0a028e20` (canonical `origin/main`)
**Companion Documents:** [`README.md`](../README.md), [`docs/supabase-migration-runbook.md`](./supabase-migration-runbook.md)

---

## 1. System Overview

BeautyBook is a multi-tenant salon booking SaaS and consumer marketplace tailored for the Metro Manila market. The platform allows beauty salons (organizations) to operate multiple branches, manage service catalogs, configure staff weekly schedules and time-off, and track appointments, while allowing customers to discover salons, inspect real availability, and book appointments without mandatory upfront registration.

### Core Stack
- **Framework:** Next.js 16.3.3 (App Router, Server Components by default, Server Actions for mutations)
- **UI Runtime:** React 19.2.8, Tailwind CSS v4 (`@tailwindcss/postcss`, light theme)
- **Language:** TypeScript 5.9.3 (`strict: true`, path alias `@/*`)
- **ORM & Database:** Prisma 7.10.0 + PostgreSQL (`pg` 8.23.0 with `@prisma/adapter-pg`)
- **Authentication:** Better Auth 1.7.2 with `@better-auth/prisma-adapter` (email/password)
- **Validation:** Zod 4.5.4 schemas in `lib/validations/`
- **Testing:** Playwright 1.55.0 (34 E2E tests), custom verify suite (11 integration scripts)
- **Payments:** Offline "Pay at salon" model (no online gateway integration)

---

## 2. Multi-Tenancy & Authorization Model

### Data Isolation
Every salon tenant is represented by an `Organization`. All operational models (`Location`, `Staff`, `ServiceCategory`, `Service`, `StaffSchedule`, `TimeOff`, `Appointment`) carry a mandatory, foreign-keyed `organizationId`.

### Membership & Role Hierarchy (`lib/org-roles.ts`)
Users link to organizations through `OrganizationMember` records with role enum `OrgRole`:
- `OWNER` (rank 4) — Full administrative rights, settings management, location creation
- `ADMIN` (rank 3) — Catalog, staff, schedule, and appointment management
- `STAFF` (rank 2) — Staff membership within an organization
- `MEMBER` (rank 1) — Baseline organization affiliation

### Server Authorization Gates (`lib/require-org.ts`, `lib/require-user.ts`)
- **`requireUser()`**: Ensures the client has an active session via Better Auth; redirects unauthenticated requests to `/login`.
- **`requireOrgMember(orgId, minimumRole?)`**: Validates that the signed-in user belongs to `orgId` and satisfies the minimum role rank. Redirects to `/dashboard` on failure.
- **`requireActiveOrgContext()`**: Resolves the user's active tenant and branch using cookies (`activeOrganizationId`, `activeLocationId`) or user memberships. Redirects to `/onboarding` if the user has no organizations.
- **`requireActiveOrgAdmin()`**: Resolves active tenant context and strictly verifies `isOrgAdminRole(membership.role)` (`OWNER` or `ADMIN`). Redirects to `/dashboard` if the user does not possess admin rights.
- **`requireAdmin()`**: Alias that delegates directly to `requireActiveOrgAdmin()`.

> [!IMPORTANT]
> **Active OrgRole is the ONLY gate for organization administration.**
> The legacy `User.role === ADMIN` attribute from the single-salon MVP does **not** grant access to `/dashboard/admin/*`. There is no platform-wide superadmin role.

---

## 3. Database Schema & Migration Architecture

The canonical schema is defined in [`prisma/schema.prisma`](../prisma/schema.prisma) and outputs to `app/generated/prisma`.

### Key Constraints & Indexes
1. **At Most One Default Location per Organization (PR #26):**
   ```prisma
   @@unique([organizationId], map: "Location_one_default_per_org", where: { isDefault: true })
   ```
   Enforced via PostgreSQL partial unique index:
   ```sql
   CREATE UNIQUE INDEX "Location_one_default_per_org" ON "Location"("organizationId") WHERE ("isDefault" = true);
   ```
   *An organization can have zero default locations, but cannot have more than one.*

2. **Published Organization Index (PR #26):**
   ```sql
   CREATE INDEX "Organization_published_idx" ON "Organization"("published");
   ```
   Optimizes marketplace catalog queries filtering for `published = true`.

3. **Staff Appointment Overlap Protection:**
   PostgreSQL `btree_gist` exclusion constraint `Appointment_staff_no_overlap` in migration `20260830034500`:
   ```sql
   ALTER TABLE "Appointment"
   ADD CONSTRAINT "Appointment_staff_no_overlap"
   EXCLUDE USING gist (
     staff_id WITH =,
     tsrange(starts_at, ends_at) WITH =
   )
   WHERE (status <> 'CANCELLED');
   ```
   Guarantees that non-cancelled appointments for the same staff member cannot overlap at the storage level.

4. **AppointmentService Uniqueness:**
   ```prisma
   @@unique([appointmentId, serviceId])
   ```
   Prevents duplicate joins between an appointment and the same service item.

5. **Organization-Scoped Time-Off (PR #25):**
   Staff time-off queries in `lib/booking.ts` and `lib/schedule.ts` strictly filter by `organizationId` and `staffId`.

### Migration Inventory (9 Migrations)
1. `20260829224926_init_auth_and_booking` — Core auth, user, and initial booking tables
2. `20260830034500_appointment_staff_no_overlap` — Enables `btree_gist` and creates exclusion constraint
3. `20260830100000_add_tenancy_tables` — Adds `Organization`, `Location`, `OrganizationMember`, `OrgRole`
4. `20260830100100_add_tenant_fks_nullable` — Adds nullable tenant foreign keys across catalog and appointments
5. `20260830100200_backfill_tenant_data` — Backfills default tenant data and enforces `NOT NULL` constraints
6. `20260830133632_add_location_area` — Adds `Location.area` for Metro Manila area filtering
7. `20260830172000_add_organization_cover_image` — Adds `Organization.coverImageUrl`
8. `20260830183000_salon_profile_and_appointment_service_unique` — Adds salon storefront profile fields and `AppointmentService` uniqueness
9. `20260903120000_location_one_default_and_org_published_idx` — Enforces partial unique default location index and published index

---

## 4. Marketplace & Conversion Foundations (PR #27)

### Route Architecture
- **`/` (Canonical Marketplace):**
  - Service-first header: *"What would you like to book?"*
  - Category pills: Hair, Nails, Massage, Brows & Lashes, etc.
  - Service chips: Filtered by active category and area
  - Manila Area filter: Dropdown with 17 Metro Manila areas (`lib/areas.ts`)
  - Date & Preferred Time picker: Optional time preference with ±30 min window
  - Quick availability pills:
    - `today`: Slots today in Manila
    - `tomorrow`: Slots tomorrow in Manila
    - `weekend`: Upcoming Saturday and Sunday in Manila
    - `open`: Open now (rounded down to half hour in Manila time)
    - `earliest`: Scans up to 7 horizon days; stops on the first day with open slots
  - Sticky booking CTA on mobile viewports
  - Salon cards (`BusinessCard.tsx`):
    - Real next-available slot badge (`NextAvailability`)
    - Trust signal row (verified salon badge, cancellation policy, pay at salon)
    - **"Book {service}" / "Book now"**: Deep-links directly to `/s/{slug}/book?serviceId=...&locationId=...`
    - **"View salon"**: Navigates to storefront `/s/{slug}`
- **`/search` & `/marketplace`:** Issue HTTP 308 permanent redirects to `/?${qs}` or `/`.
- **`/s/[orgSlug]` (Salon Storefront):**
  - Displays cover image, description, contact phone, branch locations, and opening hours.
  - Multi-service picker (`ServicePicker`) with sticky continue bar (caps: max 6 services, max 240 minutes).
- **`/s/[orgSlug]/book` (Booking Flow):**
  - Accepts both anonymous guests and logged-in members.
  - Filters staff by branch and capability to deliver *all* selected services (`staffOffersAllServices`).
  - Slots rendered on a 30-minute grid in `Asia/Manila` time.

---

## 5. Security & Test Safety Guards (PR #23)

### Fail-Closed Local Database Guard (`lib/test-only-local-db.ts`)
Mutating operations (`npm run prisma:seed`, `npm run verify`, and Playwright `global-setup.ts`) enforce `assertLocalOnlyDatabase()`:
- **Allowed Hosts:** `localhost`, `127.0.0.1`, `::1`, `[::1]`
- **Allowed Databases:** `beautybook`, `beautybook_test`, `beautybook_dev`, `ci`, `test`
- **Allowed Protocols:** `postgres:`, `postgresql:`
- **Forbidden Query Parameters:** `host`, `hostaddr`, `port`
- **No Remote Bypass:** There is no environment variable bypass (`VERIFY_ALLOW_REMOTE` does not exist). Non-local target databases are rejected unconditionally.

### Operational Separation
- **Hosted Supabase:** Target for application runtime (`npm run dev`) and deployment schema migration (`npx prisma migrate deploy`).
- **Local PostgreSQL:** Target for seeding (`npm run prisma:seed`), integration verification (`npm run verify`), and E2E tests (`npm run test:e2e`).
