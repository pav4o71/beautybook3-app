# SaaS Progress & Next Steps

**Status:** Living Document
**Canonical Reference:** Up to date with canonical `origin/main` (`b63bb8da66963c89db9f8c6a621802ce0a028e20`)
**Companion Documents:** [`README.md`](../README.md), [`docs/architecture.md`](./architecture.md), [`docs/beautybook-improvement-roadmap.md`](./beautybook-improvement-roadmap.md)

---

## 1. Completed Integration Phases

| Phase / Focus | Merged PRs | Summary of Deliverables |
|---|---|---|
| **Phase 1: Multi-Tenant Foundation** | PR #3 | `Organization`, `Location`, `OrganizationMember`, `OrgRole`; tenant scoping on catalog & bookings; active org cookies; onboarding flow. |
| **Phase 2: Multi-Location & Marketplace** | PRs #4–#6 | Admin location CRUD; branch switcher; branch-scoped bookings; marketplace category filters & `BusinessCard`. |
| **Phase 3: Hosted Supabase Alignment** | Ops / PR #3 | Migrations deployment; session pooler verification; fail-closed local test safety guard. |
| **Phase 5: Hardening & Isolation** | PRs #7–#10 | Staff schedule location assignment; cross-tenant isolation E2E (`e2e/isolation.spec.ts`); `verify/org-scope.ts`. |
| **Phase 6: Search-First Marketplace UI** | PRs #12–#15 | `Location.area` column; 14 Manila areas; landing search filters; cross-org availability search. |
| **Phase 7: Storefront & Multi-Service** | PRs #17, #19 | Salon storefront (`/s/[orgSlug]`), multi-service picker (`ServicePicker`, max 6 services, max 240 min), profile fields, `AppointmentService` uniqueness. |
| **UI Polish & Marketplace E2E** | PR #20 | Shared surfaces, `PageHeader`, alert tokens, URL encoding handling in marketplace redirects. |
| **Fail-Closed Local DB Safety** | PR #23 | Enforced `assertLocalOnlyDatabase()` in `lib/test-only-local-db.ts`; eliminated remote test bypass entirely. |
| **Organization-Role Authorization Gate** | PR #24 | Admin routes gated strictly by active `OrgRole` (`OWNER` or `ADMIN`); removed `User.role === ADMIN` gate; no superadmin path. |
| **Organization-Scoped Booking Safety** | PR #25 | Scoped staff time-off queries in `lib/booking.ts` and `lib/schedule.ts` strictly by `organizationId`. |
| **Default Location Integrity & Index** | PR #26 | Enforced partial unique index `Location_one_default_per_org` (**at most one default location per organization**) and index on `Organization(published)`. |
| **Marketplace Conversion Foundations** | PR #27 | Service-first discovery; quick availability filters (`today`, `tomorrow`, `weekend`, `open`, `earliest`); next-available badges; trust signals; card deep-link booking CTA; sticky mobile CTA. |
| **Foundation A1: Guest Contact Capture** | PR #29 | Nullable contact snapshot columns (`customerName`, `customerPhone`, `customerEmail`) on `Appointment`; server-side `libphonenumber-js` E.164 normalization; public booking requires name and phone; admin board displays real customer info with clickable `tel:` links; 100% backward compatible with historical null rows. |

---

## 2. Current Canonical Test Baseline

- **Verify Suite (`npm run verify`):** **12 scripts** executed by `scripts/verify/run-all.ts`:
  `format.ts`, `local-db-guard.ts`, `seed-counts.ts`, `areas.ts`, `marketplace-search.ts`, `marketplace-availability.ts`, `org-scope.ts`, `org-roles.ts`, `slots.ts`, `booking.ts`, `contact-capture.ts`, `appointments.ts`.
- **Playwright E2E Suite (`npm run test:e2e`):** **37 tests** across 12 spec files:
  `admin-appointments.spec.ts` (4), `auth.spec.ts` (5), `booking.spec.ts` (4), `catalog.spec.ts` (3), `guest-contact-capture.spec.ts` (3), `isolation.spec.ts` (3), `location-booking.spec.ts` (1), `locations.spec.ts` (2), `onboarding.spec.ts` (1), `salon-storefront.spec.ts` (3), `search-availability.spec.ts` (2), `search.spec.ts` (6).

---

## 3. Marketplace & Storefront Flow (Verified Behavior)

- **Marketplace Discovery (`/`):**
  - Service-first header: "What would you like to book?"
  - Category chips + service chips + Manila area `<select>` + date/time inputs.
  - Quick availability pills: `today`, `tomorrow`, `weekend`, `open`, `earliest`.
  - Salon cards show real next-available badges, trust signals, and featured service duration/pricing.
  - **"Book now"** CTA deep-links to `/s/{slug}/book?serviceId=...` using the next available service or featured service (falls back to `/s/{slug}#services` if no bookable service is found; note `BusinessCard` does not add `locationId`, unlike cross-org availability results).
  - **"View salon"** link opens `/s/{slug}` (preserving the selected service-name query parameter when one exists).
- **Storefront (`/s/{slug}`):** Catalog, opening hours from schedules, multi-service cart with sticky total bar.
- **Public Booking (`/s/{slug}/book`):** Supports both anonymous guest booking and logged-in customers.

---

## 4. Current Next Steps & Future Backlog

### Product Enhancements (Roadmap Phase 2 & 3)
1. **Self-Service Customer Registration:** Add public signup UI form (currently login-only; accounts are seeded).
2. **Customer Appointment Actions:** Enable customer cancellation and rescheduling with configurable lead-time policies.
3. **Durable Cloud Object Storage:** Integrate Cloudflare R2 or AWS S3 for salon cover images and staff photos.
4. **Online Payments & Deposits:** Add PayMongo / Stripe Connect integration for online booking deposits or prepayments.
5. **Customer Reviews & Verified Ratings:** Implement `Review` schema and customer review collection after completed appointments.
6. **Transactional Notifications:** Email and SMS confirmation, reminder, and status update notifications.

### Technical & Infrastructure Hardening
1. **Loading & Error Boundaries:** Add `loading.tsx` skeletons and `error.tsx` error boundaries across public marketplace and dashboard routes.
2. **Rate Limiting Refinement:** Fine-tune per-route rate limits for public booking and search endpoints.
3. **Next.js Proxy Migration:** Evaluate migrating `middleware.ts` to Next.js route proxying once stable.
4. **Staff Management Follow-up:** Preserve deactivated branch in staff edit picker when viewing historical staff assignments.
