# BeautyBook Product Audit

**Date:** 2026-09-03  
**Scope:** Marketplace discovery, salon storefront, booking conversion path  
**Codebase:** BeautyBook3 (`beautybook3-app`) — multi-tenant salon booking SaaS

> Product phases in this document (marketplace conversion) are **distinct** from the SaaS infrastructure phases in [`IMPLEMENTATION-PHASES.md`](./IMPLEMENTATION-PHASES.md) and [`saas-next-steps.md`](./saas-next-steps.md).

---

## 1. Current architecture

| Layer | Current state |
|-------|----------------|
| Framework | Next.js **16.3.3** App Router, React **19.2.8**, TypeScript (`strict`) |
| Package manager | **npm** (`package-lock.json`) |
| Styling | Tailwind CSS v4 (`app/globals.css`), shared utilities in `lib/ui.ts`, Geist + Geist Mono, light theme only |
| Auth | Better Auth + Prisma adapter (`lib/auth.ts`), `/api/auth/[...all]` |
| ORM / DB | Prisma 7 + Supabase Postgres; singleton `lib/prisma.ts` (`pg` + `@prisma/adapter-pg`) |
| Validation | Zod (`lib/validations/`); legacy parsers in `lib/catalog.ts` |
| Animations | **None installed** (no Motion, GSAP, Lottie, etc.) |
| Feature flags | **None** prior to Phase 1 |
| Payments | Pay-at-salon; Stripe/billing deferred |

**Patterns:** Server Components by default; `"use client"` only for filters/forms; mutations via colocated server actions; business logic in `lib/`.

---

## 2. Routes

### Public

| Path | Role |
|------|------|
| `/` | Marketplace / discovery (canonical) |
| `/search`, `/marketplace` | Permanent redirects → `/` (preserve query) |
| `/s/[orgSlug]` | Salon storefront |
| `/s/[orgSlug]/book` | Public booking (guest allowed) |
| `/login` | Sign-in |
| `/api/auth/[...all]` | Better Auth |

### Authenticated

| Path | Role |
|------|------|
| `/onboarding` | Create business |
| `/dashboard` | Home |
| `/dashboard/services`, `/staff`, `/book`, `/appointments` | Member UI |
| `/dashboard/admin/*` | Org admin (appointments, locations, categories, services, staff, settings) |

---

## 3. Data models (live schema)

**Present:** `User`, `Session`, `Account`, `Verification`, `Organization` (slug, published, cover, description, phone, timezone, currency), `OrganizationMember`, `Location` (area, address), `ServiceCategory`, `Service`, `Staff`, `StaffService`, `StaffSchedule`, `TimeOff`, `Appointment`, `AppointmentService`.

**Enums:** `Role`, `OrgRole`, `AppointmentStatus`, `Weekday`.

**Not in live schema:** Review/rating, Verified badge entity, Deposit/booking policy, Waitlist, GiftCard, Loyalty, Gallery/Look, SalonTheme/mini-site config.

**Availability:** Computed at request time in `lib/booking.ts` + `lib/schedule.ts` (30-minute grid, Asia/Manila). Marketplace calls `searchMarketplaceAvailability` when `?date=` is set. No precomputed slot table.

**Unused sketch:** `prisma/schema-saas.prisma` (Tenant-based) — do not point Prisma at it.

---

## 4. Marketplace & salon card implementation

### Discovery (`app/page.tsx`)

- H1 historically **“Search”** (Phase 1 reframes to service-first copy).
- Query params: `category`, `service`, `area`, `date`, `time`, `serviceId`.
- Without `date`: salon grid via `listMarketplaceOrganizations` → `BusinessResults` → `BusinessCard`.
- With `date`: availability list via `searchMarketplaceAvailability` → `AvailabilityResults` (cap 50).

### Filters (`app/search/search-filters.tsx`)

- Category chips + service name chips (horizontal scroll).
- Area `<select>` from `MANILA_AREAS` (not city chips).
- Date + preferred time (±30 min window).

### Salon card (`components/booking/BusinessCard.tsx`)

Renders: cover (or placeholder), name, from-price + featured service, service count, locations, **View salon** / **Book now**.

Prior gap: both CTAs pointed at the same storefront URL; no next-available or trust signals.

### Salon storefront (`app/s/[orgSlug]/page.tsx`)

Cover, about, locations/hours, `ServicePicker` (sticky Continue bar). Staff `photoUrl` exists in data but was not rendered.

---

## 5. UX strengths

1. Real multi-tenant isolation and published-org marketplace.
2. Real availability search (not fabricated slots) with deep-link book URLs.
3. Clean Server Component default; logic concentrated in `lib/`.
4. Solid E2E coverage for search, availability, booking, org isolation.
5. Calm zinc UI — low visual noise on conversion paths.
6. Manila timezone and PHP pricing helpers already correct for the market.

---

## 6. UX problems (conversion-focused)

1. Booking CTA on cards was weak (duplicate destinations; Book now ≠ book flow).
2. Next availability hidden until the user picks a date.
3. No trust signals — hard to compare salons.
4. Cards can grow unevenly with many locations; limited hover/focus polish.
5. Mobile: no sticky marketplace/salon Book bar on the storefront hero path.
6. Service-first intent existed as chips, but framing was still salon-list first.
7. Performance risk if next-slot is computed naively for every salon × staff × day.
8. No marketplace `loading.tsx` / skeleton; homepage is `force-dynamic` SSR.
9. No ratings/reviews schema — any rating UI must stay hidden until real data exists.

---

## 7. Key technical risks

| Risk | Mitigation |
|------|------------|
| Next-available on cards amplifies DB load | Short horizon, concurrency limit, omit badge if budget exceeded — never fake times |
| Cross-org availability already capped at 50 | Keep caps; reuse `getAvailableSlotsForDay` |
| No Review model | Typed nullable trust signals; render only non-null fields |
| External animation repos | Phase 2+/marketing only; license check before any reuse |
| Phase numbering collision with SaaS docs | This audit uses **product** Phase 1–3; SaaS phases stay in existing docs |
| Heavy client trees / animation on checkout | Keep booking paths CSS-only and server-first |

---

## 8. Proposed priorities

Ordered by **booking conversion impact**, then **low risk / reuse**:

1. **Phase 1 — Marketplace conversion foundations** (implement now)
   - Sticky booking CTA
   - Service-first discovery framing
   - Quick availability filters (real data only)
   - Next available on salon cards
   - Truthful trust signals (area + availability; ratings typed but hidden)
   - Card layout, a11y, CTA destination polish
2. **Phase 2 — Booking depth & retention**
   - Progressive booking flow, book-by-pro, policies, verified reviews, rebook, waitlist
3. **Phase 3 — Premium salon mini-sites**
   - Branded templates, gallery, gift cards, rich storytelling (lazy animation)

---

## 9. Component map (as of audit)

| Area | Path |
|------|------|
| Marketplace page | `app/page.tsx` |
| Filters | `app/search/search-filters.tsx` |
| Salon results | `app/search/business-results.tsx` |
| Availability results | `app/search/availability-results.tsx` |
| Salon card | `components/booking/BusinessCard.tsx` |
| Marketplace queries | `lib/marketplace.ts` |
| Slots | `lib/booking.ts`, `lib/schedule.ts` |
| Storefront | `app/s/[orgSlug]/page.tsx`, `service-picker.tsx` |
| Booking form | `app/dashboard/book/booking-form.tsx` |
| UI tokens | `lib/ui.ts` |
| Header | `components/site-header.tsx` |
