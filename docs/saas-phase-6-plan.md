# Phase 6 — Search-first marketplace UI

**Status:** Complete (PRs [#12](https://github.com/pav4o71/beautybook3-app/pull/12)–[#15](https://github.com/pav4o71/beautybook3-app/pull/15))  
**Base:** `main` after Phase 5 (PRs #7–#11)  
**Goal:** Replace salon-first browsing with **service-first discovery**: category → services → area → day/time → available salons → book.

---

## User journey (target)

```
/  (landing)
  └─ Pick category: Hair | Nails | …
       └─ /search?category=hair
            ├─ See all Hair services across Manila salons (name, price, salon, branch area)
            ├─ Optional: filter by area (Makati, BGC, QC, …)
            ├─ Optional: pick date + time window
            └─ Results narrow to salons with real availability
                 └─ “Book” → /s/{orgSlug}/book?serviceId&locationId&staffId&startsAt
```

Logged-in customers can still use `/dashboard/book` (org-scoped demo salon); public flow is the redesign focus.

---

## Current state (audit)

| Area | Today | Gap |
|------|-------|-----|
| Landing `/` | Hero + “Browse marketplace” link | No category search |
| `/marketplace` | Salon grid + category pills | Salon-centric, not service list |
| `lib/marketplace.ts` | `listMarketplaceOrganizations(category?)` | No services, area, or availability |
| `Location` model | `address` only | **No `area` field** — area filter impossible without migration |
| `lib/areas.ts` | Missing | Planned in `BEAUTYBOOK3-SAAS-UPGRADE-PLAN.md`; duplicated in `AreaFilter.tsx` |
| `components/booking/*` | 5 scaffolds unused (`AreaFilter`, `ServiceCard`, …) | Not wired; gray/blue styles ≠ `lib/ui.ts` |
| `getAvailableSlots()` | Per staff, 7-day window, single org | No cross-org / date-specific marketplace search |
| E2E | `e2e/marketplace.spec.ts` (salon list + category pills) | Must update for new search UX; keep seed assertions |

**Keep unchanged:** multi-tenant scoping, server actions for booking, `BookingForm` core logic, admin dashboard, auth, CI gates.

---

## Architecture rules (do not break)

1. **Data access** — new queries in `lib/marketplace.ts` (or `lib/marketplace-search.ts`); extend `lib/booking.ts` only for slot helpers.
2. **Org isolation** — marketplace queries filter `organization.published: true`; never expose unpublished org data.
3. **URL state** — filters via `searchParams` (`category`, `serviceId`, `area`, `date`, `time`); shareable links, SSR-friendly.
4. **Server Components default** — client components only for interactive filters (`"use client"` wrappers).
5. **No new REST routes** — use pages + existing `bookPublicSlot` action; optional server action for availability if needed.
6. **Styling** — Tailwind + `lib/ui.ts` tokens; light theme (`text-zinc-900`, `bg-white`).
7. **Money** — `priceCents` + `formatPrice()` (PHP).
8. **Timezone** — `Asia/Manila` via `@/lib/timezone.ts`; store UTC, display Manila.

---

## Schema change (required for area filter)

Phase 5 doc said “no schema changes”; **Phase 6 requires one small migration**:

```prisma
model Location {
  // …existing fields…
  area  String?  // e.g. "Makati", "BGC (Taguig)", "Quezon City"
  @@index([area])
}
```

- Migration + backfill from seed addresses (`prisma/seed.ts`, `prisma/seed-extra-orgs.ts`).
- Admin location forms: add `area` select from `MANILA_AREAS`.
- Replace hardcoded list in `components/booking/AreaFilter.tsx` with `lib/areas.ts`.

---

## New / updated lib API

### `lib/areas.ts` (new)

```typescript
export const MANILA_AREAS = [/* canonical list */] as const;
export type ManilaArea = (typeof MANILA_AREAS)[number];
```

### `lib/marketplace.ts` (extend)

| Function | Purpose |
|----------|---------|
| `listMarketplaceServices({ categorySlug, area? })` | Cross-org active services with org, location, price |
| `listMarketplaceCategoryFilters()` | Keep; used on landing search |
| `searchMarketplaceAvailability({ categorySlug?, serviceId?, area?, date, time? })` | Salons/staff/slots matching filters |

### `lib/booking.ts` (extend)

| Function | Purpose |
|----------|---------|
| `getAvailableSlotsForDay({ organizationId, staffId, durationMin, date })` | Slots on one Manila calendar day (reuse schedule logic from `getAvailableSlots`) |

`searchMarketplaceAvailability` algorithm (high level):

1. Resolve candidate services (by `serviceId` or `categorySlug`).
2. Filter locations by `area` when set.
3. For each staff linked to service at that location, call `getAvailableSlotsForDay`.
4. If `time` set, keep slots within ±30 min (or exact match).
5. Return ranked results: `{ org, location, service, staff, startsAt, priceCents }[]`.

Cap results (e.g. 50) to avoid N×M explosion on cold start.

---

## Routes & pages

| Route | Action |
|-------|--------|
| `/` | Redesign: prominent **category search** (grid or combobox) → links to `/search?category={slug}` |
| `/search` | **New** main discovery page (filters + results). Replaces salon-first mental model. |
| `/marketplace` | **301 redirect** to `/search` (or thin wrapper) — update E2E accordingly |
| `/s/[orgSlug]` | Visual polish only; keep salon landing |
| `/s/[orgSlug]/book` | Accept new query params: `startsAt` (ISO) to pre-select slot; existing `serviceId`, `locationId`, `staffId` |

### Page files to create / modify

| File | Change |
|------|--------|
| `app/page.tsx` | Search-first landing |
| `app/search/page.tsx` | New discovery page |
| `app/search/search-filters.tsx` | Client: category, area, date, time |
| `app/search/service-results.tsx` | Server: service list |
| `app/search/availability-results.tsx` | Server: slot-matched salons |
| `app/marketplace/page.tsx` | Redirect or delegate to `/search` |
| `app/dashboard/admin/locations/*` | Area field on create/edit |
| `components/booking/AreaFilter.tsx` | Use `lib/areas.ts` + `lib/ui.ts` |
| `components/booking/ServiceCard.tsx` | Wire into search results |
| `components/booking/CategoryCard.tsx` | Wire into landing |
| `components/booking/DateTimePicker.tsx` | Replace static times with URL-driven date + time select (or deprecate in favor of native inputs) |
| `components/booking/BusinessCard.tsx` | Optional: show area badge; keep `data-testid` patterns |

---

## PR order (sequential merges)

| PR | Branch | Scope | Gates |
|----|--------|-------|-------|
| **#12** | `feat/phase-6a-location-area` | `Location.area` migration, seed backfill, `lib/areas.ts`, admin location area field | build, verify, e2e |
| **#13** | `feat/phase-6b-search-landing` | Landing search UI + `/search` service list (category + area, no time yet) | + update marketplace e2e |
| **#14** | `feat/phase-6c-availability-search` | `searchMarketplaceAvailability`, date/time filters, result cards, book deep-links | + new e2e search flow |
| **#15** | `feat/phase-6d-ui-polish` | Dashboard/public visual refresh, scaffold cleanup, `lib/ui.ts` consistency | all 25+ e2e green |

Each PR: Bugbot → `gh pr checks --watch` → merge → delete branch.

---

## E2E strategy

| File | Change |
|------|--------|
| `e2e/marketplace.spec.ts` | Rename/adapt to `e2e/search.spec.ts`; test category → services → area filter |
| `e2e/booking.spec.ts` | Unchanged (dashboard book) |
| New `e2e/search-availability.spec.ts` | category + area + date → result → public book page with prefilled service |

Preserve seed-dependent strings: `BeautyBook Demo Salon`, `Glow Nail Studio`, `₱350.00`, `category-hair`, etc. Update URLs from `/marketplace` → `/search` where needed.

---

## Seed data expectations (after 6A)

| Salon | Location | Suggested `area` |
|-------|----------|------------------|
| BeautyBook Demo | Main location | Makati |
| BeautyBook Demo | BGC branch | BGC (Taguig) |
| Glow Nail Studio | QC Studio | Quezon City |
| Luxe Hair Lounge | Makati Studio | Makati |
| Luxe Hair Lounge | Ortigas branch | Ortigas |

Categories (cross-org slugs): `hair`, `nails` (already in seed).

---

## Deferred (out of Phase 6)

- Stripe / billing (Phase 4)
- Org invites (2D)
- `middleware.ts` → proxy
- Rate-limit tuning
- Geo distance / maps
- Ratings & reviews
- Inactive staff location picker fix (Phase 5 Bugbot)

---

## Acceptance criteria

- [x] Visitor lands on `/`, picks **Hair**, sees hair services from multiple salons
- [x] Area filter shows only salons/branches in that area
- [x] Date + time filter shows only offerings with **real** staff availability
- [x] “Book” lands on `/s/{slug}/book` with service/location/staff/slot prefilled
- [x] `npm run build`, `npm run verify`, `npm run test:e2e` pass in CI
- [x] No org data leaks; unpublished salons hidden
- [x] Admin can set location `area` when creating/editing branches
