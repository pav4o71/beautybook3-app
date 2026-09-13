# BeautyBook Architecture & Technical Specifications

**Canonical Reference:** BeautyBook Multi-Tenant SaaS & Marketplace

---

## 1. System Overview

BeautyBook is a multi-tenant salon booking SaaS and consumer marketplace tailored for the Metro Manila market. The platform allows beauty salons (organizations) to operate multiple branches, manage service catalogs, configure staff schedules and time-off, and track appointments. Customers can discover salons, inspect real availability, and book appointments without mandatory upfront registration.

### Core Stack
- **Framework:** Next.js (App Router, Server Components, Server Actions)
- **UI Runtime:** React, Tailwind CSS (light theme)
- **Language:** TypeScript
- **ORM & Database:** Prisma 7 + PostgreSQL
- **Authentication:** Better Auth (email/password)
- **Validation:** Zod
- **Testing:** Playwright E2E and custom `verify` integration checks
- **Payments:** Offline "Pay at salon" model (no online gateway integration)

---

## 2. Multi-Tenancy & Authorization Model

### Data Isolation
Every salon tenant is represented by an `Organization`. All operational models (`Location`, `Staff`, `ServiceCategory`, `Service`, `StaffSchedule`, `TimeOff`, `Appointment`) carry a mandatory, foreign-keyed `organizationId`.

### Membership & Role Hierarchy (`lib/org-roles.ts`)
Tenant access is strictly determined by `OrganizationMember.role` (mapped to `OrgRole` enum):
- `OWNER` (Rank 100): Full control over organization settings, locations, catalog, staff, and appointments.
- `ADMIN` (Rank 50): Equivalent to OWNER, restricted from destroying the organization or transferring ownership.
- `MEMBER` (Rank 10): Standard staff access (e.g., viewing schedules and appointments).

### Server Authorization Gates (`lib/require-org.ts`, `lib/require-user.ts`)
- **`requireUser()`**: Ensures the client has an active session via Better Auth; redirects unauthenticated requests to `/login`.
- **`requireOrgMember(orgId, minimumRole?)`**: Validates that the signed-in user belongs to `orgId` and satisfies the minimum role rank.
- **`requireActiveOrgContext()`**: Resolves the user's active tenant and branch using cookies (`activeOrganizationId`, `activeLocationId`) or user memberships. Redirects to `/onboarding` if the user has no organizations.
- **`requireActiveOrgAdmin()` / `requireAdmin()`**: Resolves active tenant context and strictly verifies `isOrgAdminRole(membership.role)` (`OWNER` or `ADMIN`). Redirects to `/dashboard` if the user does not possess admin rights.

> [!IMPORTANT]
> **Active OrgRole is the ONLY gate for organization administration.**
> The legacy `User.role === ADMIN` attribute from the single-salon MVP does **not** grant access to `/dashboard/admin/*`. There is no platform-wide superadmin role.

---

## 3. Database Schema & Migration Architecture

The canonical schema is defined in `prisma/schema.prisma`.

### Key Constraints & Indexes
1. **At Most One Default Location per Organization:**
   Enforced via PostgreSQL partial unique index `Location_one_default_per_org` (`WHERE isDefault = true`). An organization can have zero default locations, but cannot have more than one.

2. **Published Organization Index:**
   `Organization_published_idx` optimizes marketplace catalog queries filtering for `published = true`.

3. **Staff Appointment Overlap Protection:**
   PostgreSQL `btree_gist` exclusion constraint `Appointment_staff_no_overlap` guarantees that non-cancelled appointments for the same staff member cannot overlap at the storage level.

4. **AppointmentService Uniqueness:**
   `@@unique([appointmentId, serviceId])` prevents duplicate joins between an appointment and the same service item.

5. **Appointment Contact Snapshots:**
   `customerName`, `customerPhone`, and `customerEmail` are persisted as immutable point-in-time snapshots on `Appointment`. This preserves historical records even if customer profiles change or are deleted. Phone numbers are normalized strictly server-side to canonical E.164.

---

## 4. Identity, Customers, & Public Booking

### Better Auth Lifecycle
Authentication uses Better Auth for email/password registration and login.
- **Email Verification:** Mandatory before users can log in via password.
- **Session Revocation:** Resetting passwords actively revokes existing sessions.

### Customer Ownership & Zero-Org Users
Customer identity is decoupled from tenant membership:
- A user account may have zero `OrganizationMember` records (a "zero-org customer").
- Appointment ownership is governed by `Appointment.customerId === User.id`.
- The `/account` route provides a central dashboard for these zero-org customers to view their cross-salon booking history.

### Public Guest Booking & Management Token
- **Guest Booking:** Unauthenticated users can book appointments.
- **Guest-to-Account Linking:** An unauthenticated guest booking can be linked to a customer account *only* after Better Auth verifies the email address matches the guest booking.
- **Management Capability (`/b/[token]`):** Appointments can be securely managed (cancelled/rescheduled) by unauthenticated users via a high-entropy management token. Only the SHA-256 hash of this token is stored in the database. The raw token is sent once via email and never persisted.

---

## 5. Marketplace & Conversion Foundations

### Route Architecture
- **`/` (Canonical Marketplace):**
  - Service-first discovery, filtered by category and Metro Manila area (`lib/areas.ts`).
  - Next-available badge (`NextAvailability`) and Trust signal row (`TrustSignalRow`).
- **`/search` & `/marketplace`:** Issue HTTP 308 permanent redirects to `/?${qs}` or `/`.
- **`/s/[orgSlug]` (Salon Storefront):** Displays cover image, description, branch locations, opening hours, and a multi-service picker.
- **`/s/[orgSlug]/book` (Booking Flow):** Filters staff by branch and capability (`staffOffersAllServices`).

### Admin Day Board & Walk-Ins
- **True Temporal Positioning:** The admin dashboard (`/dashboard/admin/appointments`) implements a real timeline view. Appointments are positioned vertically using CSS absolute positioning (`top`, `height`) based on their actual duration and start time on a 30-minute grid.
- **Walk-Ins:** Admins can quickly inject walk-in appointments into the calendar, leveraging the same underlying booking validation.

---

## 6. Email Delivery & Rate Limiting

### Notification Delivery Architecture
- The `NotificationDelivery` model tracks asynchronous background email delivery state (PENDING, CLAIMED, DELIVERED, FAILED).
- Claim tokens and lease expiry mechanisms prevent duplicate delivery and handle worker restarts gracefully.
- Auth verification and password reset emails utilize Next.js `after()` API to perform non-blocking delivery while returning an immediate response to the client.

### Rate Limiting (Abuse Protection)
- Enforced using a `RateLimitBucket` model in PostgreSQL (fixed-window architecture).
- Subjects (like IP or email) are hashed before storage; raw PII/identifiers are never saved in the bucket.
- Production usage requires a robust `RATE_LIMIT_SECRET` to salt these hashes.

---

## 7. Validation & CI Architecture

### Database Safety Guard (`lib/test-only-local-db.ts`)
Mutating commands (`verify`, `seed`, `test:e2e`) are protected by a strict fail-closed database guard.
- Only safe local host targets (`localhost`, `127.0.0.1`, `::1`) are allowed.
- Only test/dev database names (`beautybook_dev`, `test`, `ci`, etc.) are permitted.
- No environment variable bypass exists. **Autonomous agents must follow `AGENTS.md` and only target `beautybook_dev` on port `5433`.**

### CI Runner
- `scripts/verify/run-all.ts` acts as the integration test runner.
- The Playwright suite (`e2e/`) provides full end-to-end coverage using a seeded local database.

---

## 8. Known Follow-Ups & Roadmap Status
- **Roadmap Consolidation (DOC-2):** Product plans are currently disjointed and will be addressed in upcoming DOC-2 work.
- **Operations & Environment (DOC-4):** Stricter formalization of environment variables (like `RATE_LIMIT_SECRET`) and documentation of CI node versions will be handled in DOC-4.

> For historical or future plans, see the Authority Index in `docs/README.md`.
