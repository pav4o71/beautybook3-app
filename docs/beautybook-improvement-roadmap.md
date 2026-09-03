# BeautyBook Improvement Roadmap

**Date:** 2026-09-03  
**Companion audit:** [`beautybook-product-audit.md`](./beautybook-product-audit.md)

Product phases below are **marketplace / conversion** phases. They do not replace SaaS infra phases in [`saas-next-steps.md`](./saas-next-steps.md).

---

## Guiding principles

- Highest booking-conversion impact first; lowest implementation risk when tied.
- Reuse existing Prisma models, slot math, and Server Components.
- Never show fake ratings, reviews, urgency, or availability.
- Keep marketplace, booking checkout, and dashboard calm; reserve rich motion for marketing and premium mini-sites.
- Prefer typed adapters + feature flags over premature schema sprawl.

---

## Component architecture (target)

| Concern | Location | Notes |
|---------|----------|-------|
| Marketplace filters | `app/search/search-filters.tsx` + quick-avail chips | URL-driven; server-readable params |
| Salon cards | `components/booking/BusinessCard.tsx` | Presentational; data from `MarketplaceListing` |
| Availability badges | `components/marketplace/availability-badge.tsx` | Formats `NextAvailability` |
| Trust signals | `components/marketplace/trust-signal-row.tsx` | Renders only non-null fields |
| Sticky booking CTA | `components/marketplace/sticky-booking-cta.tsx` | Salon + optional marketplace mobile |
| Booking flow (Phase 2) | `components/booking/flow/*` | Stepper; persist safe selections |
| Mini-site templates (Phase 3) | `components/salon-site/templates/*` | Data-driven registry, not duplicated pages |
| Gallery / Book the Look (Phase 2–3) | `components/salon-site/looks/*` | Consent-gated before/after |
| Animation wrappers (Phase 2+) | `components/motion/*` | Lazy, `prefers-reduced-motion` |
| Feature flags | `lib/feature-flags.ts` | Env/const; unfinished routes off by default |
| Availability adapter | `lib/availability/*` | Real slot computation; no production mocks |
| Trust types | `lib/trust/types.ts` | Nullable rating/verified/popular |

---

## Phase 1 — Marketplace conversion foundations

**Goal:** Make discover → compare → book clearer on mobile and desktop without new payment/review schema.

| # | Feature | Complexity | Dependencies | Routes / components | Data model | Test plan | Inspiration | License check |
|---|---------|------------|--------------|---------------------|------------|-----------|-------------|---------------|
| 1 | Sticky booking CTA | S | Existing `ServicePicker` sticky pattern | `/s/[orgSlug]`, `/`, `StickyBookingCta` | None | E2E: sticky visible on salon; keyboard focus | — (original) | N/A |
| 2 | Service-first search | S–M | Existing category/service chips | `/`, `SearchFilters`, `page.tsx` | None | E2E: heading + chip filter still works | Awesome Landing Pages (layout research only) | Research only — no clone |
| 3 | Quick availability filters | M | `searchMarketplaceAvailability`, timezone helpers | `SearchFilters`, `page.tsx` | None (query params) | E2E: today/tomorrow set real `date`; open-now uses Manila time | Animata (micro-interaction ref) | Check before copy; prefer CSS |
| 4 | Next available on cards | M–L | `getAvailableSlotsForDay`, concurrency limits | `lib/availability/*`, `marketplace.ts`, `BusinessCard` | Computed field on listing type | Verify helper + E2E badge presence/absence | — | N/A |
| 5 | Trust signals (truthful only) | S | Listing locations + next availability | `TrustSignalRow`, `lib/trust/types.ts` | Types only; ratings null | Unit/UI: null ratings omitted | — | N/A |
| 6 | Card design polish | S | Tailwind / `lib/ui.ts` | `BusinessCard` | None | Visual + a11y: focus rings, distinct CTAs | — | N/A |

**Phase 1 schema changes:** none expected (metadata computed in app layer).

**Out of Phase 1:** Motion/GSAP/Aceternity installs, reviews, deposits, waitlist, mini-sites, gift cards, 3D, beauty quiz.

---

## Phase 2 — Better booking and retention

| # | Feature | Complexity | Dependencies | Routes / components | Data model changes | Test plan | Inspiration | License check |
|---|---------|------------|--------------|---------------------|--------------------|-----------|-------------|---------------|
| 7 | Service comparison / menu | M | Storefront services | `/s/[orgSlug]`, interactive menu | Optional add-on relation if needed | E2E menu select + caps | Animata chips | Before reuse |
| 8 | Book by professional | M | `Staff`, `StaffService` | Profiles + “any professional” | Optional specialty field | E2E staff pick | — | N/A |
| 9 | Progressive booking flow | L | Existing `BookingForm` | Multi-step book UI | Session/cookie for safe draft | E2E step validation | Motion (step transitions) | MIT — verify version |
| 10 | Deposits / cancellation policy | M | No Stripe yet | Policy display before confirm | `BookingPolicy` model | Unit parse + UI show | Stripe docs (integration later) | N/A for placeholders |
| 11 | Verified post-appointment reviews | L | `COMPLETED` appointments | Review form + listing | `Review` model | E2E: only after complete | — | N/A |
| 12 | One-click rebooking | M | Appointment history | Dashboard rebook CTA | None | E2E prefill | — | N/A |
| 13 | Waitlist | L | Slot cancel/create hooks | Waitlist join + notify abstraction | `WaitlistEntry` | Unit notify mock | — | N/A |

**Payments:** typed interfaces + document Stripe Connect / Checkout integration point; no collection until architecture exists ([`saas-next-steps.md`](./saas-next-steps.md) Phase 4).

---

## Phase 3 — Premium salon mini-sites

| Feature | Complexity | Dependencies | Routes | Data model | Test plan | Inspiration | License check |
|---------|------------|--------------|--------|------------|-----------|-------------|---------------|
| Branded mini-site `/salons/{slug}` or enhance `/s/{slug}` | L | Phase 1–2 storefront | Template registry | `SalonSiteSettings`, gallery, social links | Template smoke + a11y | Aceternity UI, Magic UI | **Required** MIT/compatible only |
| Templates (Luxury Hair, Nail, Bridal, MedSpa, Barber, Spa, Minimal) | L | Shared sections | `components/salon-site/templates/*` | Theme tokens | Visual regression per template | Awesome Landing Pages (patterns) | Research only |
| Gallery / transformations | M | Consent flags | Gallery sections | `Look`, `LookMedia` | Consent gating | GSAP/Lenis optional | GSAP has commercial license caveats — prefer Motion or CSS unless licensed |
| Gift cards (optional) | L | Payments | Gift card pages | `GiftCard` | Redemption state machine | R3F optional 3D hero | Lazy-load; static fallback |
| Persistent booking CTA | S | Phase 1 sticky | All mini-site layouts | None | Mobile sticky | — | N/A |

**Animation policy (Phase 3+):**

| Library | Allowed surfaces | Not allowed | License note |
|---------|------------------|-------------|--------------|
| Motion | Modals, filter panels, booking steps, marketing | — | Prefer as primary animation layer |
| Magic UI / React Bits / Aceternity / Animata | Marketing, mini-sites | Checkout, dashboard core | Check each repo LICENSE before import; prefer original equivalents if unclear |
| GSAP / Lenis | Optional premium storytelling | Marketplace / checkout / dashboard | GSAP Club/commercial terms — do not ship without clearance |
| R3F / Drei | Opt-in lazy 3D add-on | Default booking path | MIT; still lazy + static fallback |
| Lottie / dotLottie | Empty/success illustrations | Critical path blocking | Prefer current dotLottie runtime; original assets only |

---

## Premium features (planned; feature-flagged)

| Feature | Flag (planned) | Model sketch | Notes |
|---------|----------------|--------------|-------|
| Book the Look | `FEATURE_BOOK_THE_LOOK` | `Look` → service, artist, price, duration, media, consent | CTA → booking with prefill |
| Smart availability labels | Phase 1 adapter | Reuse `NextAvailability` | Evening / tomorrow — truthful only |
| Beauty finder quiz | `FEATURE_BEAUTY_QUIZ` | No DB initially; query builder | Behind `/quiz` or flag |
| Booking confirmation hub | Post-book page | Extend success UI | Calendar, policy, rebook |
| Loyalty / rebooking | `FEATURE_LOYALTY` | `LoyaltyAccount`, points | Never fake balances |
| Interactive service menu | Phase 2 | Existing services | Mobile-first |
| Customer dashboard upgrades | Phase 2 | Saved salons/looks | Real utility only |
| Premium story page | Phase 3 template | Settings + CMS-like fields | Optional |
| Digital gift cards | `FEATURE_GIFT_CARDS` | Amount, recipient, balance, QR | Payment boundary required |

---

## Phase 1 detailed implementation notes

### Query params (extend carefully)

| Param | Meaning |
|-------|---------|
| `category`, `service`, `serviceId`, `area`, `date`, `time` | Existing |
| `avail` (optional) | Quick filter key: `today` \| `tomorrow` \| `weekend` \| `open` \| `earliest` — maps to real dates/windows |

### Next-available algorithm

1. For each listing (or filtered subset), resolve target service (filter name → featured service).
2. Load active staff offering that service at active locations (area-aware).
3. Scan Manila calendar days from today through end of upcoming weekend (or ≤7 days).
4. First future free slot wins; format relative label.
5. Concurrency limit (e.g. 4–6 orgs at a time); if budget exceeded, leave `nextAvailability` null and omit badge.

### Trust signal priority on card (max 2–3)

1. Next availability (or honest empty).
2. Primary area.
3. Optional subtle “Listed” — skip if cluttered.
4. Rating / popular / cancellation: **hidden while null**.

---

## Success metrics (product)

- Higher click-through from card **Book now** to `/book`.
- More sessions that set a date/quick-avail filter before abandoning.
- Lower bounce on salon storefront mobile (sticky CTA engagement).
- Zero incidents of fake availability/ratings in production.

---

## Rollout

1. Ship Phase 1 behind calm UI (no heavy libs).
2. Measure; then Phase 2 booking stepper + reviews schema.
3. Phase 3 templates as opt-in per org (`SalonSiteSettings.templateId`).
