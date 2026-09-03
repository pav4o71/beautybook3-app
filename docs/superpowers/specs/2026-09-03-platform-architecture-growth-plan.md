# BeautyBook3 Platform Architecture & Growth Plan

**Date:** 2026-09-03  
**Role:** Full-stack architecture, DB integrity, UX, growth strategy  
**Status:** Design for review (implementation gated on approval)  
**Context:** Multi-tenant salon marketplace for Manila; Phases 1–3, 5–7 + listing customization done; **Phase 4 billing not started**

---

## 1) Current assessment

### What exists today

| Layer | State |
|-------|--------|
| Product | Search-first marketplace (`/`), salon storefront (`/s/{slug}`), multi-service book, org dashboard |
| Tenancy | `Organization` + `OrganizationMember` + `Location`; cookie org context |
| Auth | Better Auth email/password; `requireUser` / `requireActiveOrgAdmin` |
| Listings | `ListingTier` STANDARD/PREMIUM; theme, gallery, layout editor (data-driven, **not billed**) |
| Money | Pay-at-salon only; `priceCents` integer PHP |
| Infra | Next.js 16, Prisma 7, Supabase Postgres (session pooler), local uploads |

### Gaps / integrity risks

1. **No paid subscription** — Premium features are seed/admin flags; no Stripe, no plan limits enforcement for staff/locations.
2. **JSON blobs** (`listingTheme`, `storefrontLayout`, `listingPresets`) — flexible but need Zod on every read/write (already partially done).
3. **Uploads on local disk** — corruptible on ephemeral hosts; needs object storage.
4. **In-memory auth rate limit** — not multi-instance safe.
5. **No monitoring/Sentry**, no CSP, no public signup UX.
6. **Guest bookings** (`customerId` null) — harder loyalty/analytics later.
7. Stale `prisma/schema-saas.prisma` — must **not** become live source of truth.

### Recommended product framing

BeautyBook is a **B2B2C operational SaaS + discovery marketplace**:

- **Customers** discover and book (free).
- **Salons (business clients)** pay BeautyBook for listing visibility + tools.
- **Near-term billing:** platform subscriptions (not Connect payouts).
- **Later:** optional deposits via Connect if BeautyBook routes customer payments to salons.

---

## 2) Database schema & normalization strategy

### Principles

1. **3NF for transactional entities** (User, Org, Appointment, Service, Photo).
2. **Controlled JSON** only for presentation configs (theme/layout/presets) — always Zod-validated; never store money or auth in JSON.
3. **Soft-deactivate** (`active: false`) for catalog rows referenced by appointments.
4. **Money as integer centavos**; times UTC; display Asia/Manila.
5. **Every business row** carries `organizationId` (except platform-global tables).
6. **Webhook idempotency** table for Stripe events.

### Keep (current core) — abbreviated

```text
User(id, email UNIQUE, role, phone, …)
Organization(id, slug UNIQUE, published, listingTier, photoLimit,
  listingTheme JSON, storefrontLayout JSON, listingPresets JSON, …)
OrganizationMember(orgId, userId, role) UNIQUE(org,user)
Location(orgId, name, city, area, active, …)
Service / ServiceCategory / Staff / StaffService / StaffSchedule / TimeOff
Appointment(orgId, locationId, staffId, startsAt, endsAt, status, …)
  + Postgres EXCLUDE overlap on staff
AppointmentService(appointmentId, serviceId, durationMin, priceCents snapshot)
ListingPhoto(orgId, url, caption, sortOrder)
```

### Add — billing & integrity (Phase 4)

```prisma
enum SubscriptionStatus {
  TRIALING
  ACTIVE
  PAST_DUE
  CANCELED
  INCOMPLETE
  UNPAID
}

enum PlanCode {
  STARTER   // maps to STANDARD listing
  GROWTH    // maps to PREMIUM listing
  SCALE     // premium + higher limits
}

model Plan {
  id              String   @id @default(cuid())
  code            PlanCode @unique
  name            String
  description     String?
  /// Stripe Product id
  stripeProductId String?  @unique
  /// Default monthly Price id
  stripePriceMonthlyId String?
  stripePriceYearlyId  String?
  listingTier     ListingTier
  maxLocations    Int
  maxStaff        Int
  maxPhotos       Int
  featuredSortBoost Int @default(0)
  active          Boolean @default(true)
  sortOrder       Int @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  subscriptions   Subscription[]
}

model Subscription {
  id                   String @id @default(cuid())
  organizationId       String @unique
  planId               String
  status               SubscriptionStatus @default(INCOMPLETE)
  stripeCustomerId     String? @unique
  stripeSubscriptionId String? @unique
  currentPeriodStart   DateTime?
  currentPeriodEnd     DateTime?
  cancelAtPeriodEnd    Boolean @default(false)
  trialEndsAt          DateTime?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  plan         Plan         @relation(fields: [planId], references: [id])

  @@index([status])
  @@index([stripeSubscriptionId])
}

model StripeEvent {
  id          String   @id // Stripe event id (evt_…)
  type        String
  processedAt DateTime @default(now())
  payloadHash String?
}

model OrganizationSettings {
  organizationId   String @id
  bookingEnabled   Boolean @default(true)
  showOnMarketplace Boolean @default(true)
  timezoneOverride String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  organization     Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}
```

### Optional next-wave tables (Phase 5+)

| Table | Purpose |
|-------|---------|
| `Review` | Trust signals (orgId, appointmentId?, rating 1–5, body, moderated) |
| `Invite` | Org invites (email, role, token hash, expiresAt) |
| `MediaAsset` | Replace local files (storageKey, mime, bytes, checksum) |
| `AuditLog` | Admin mutations (actorId, orgId, action, meta JSON) |

### Example records

**Plan**

| code | name | listingTier | maxLocations | maxStaff | maxPhotos | PHP/mo (Price) |
|------|------|-------------|--------------|----------|-----------|----------------|
| STARTER | Starter | STANDARD | 1 | 3 | 1 | ₱0 (or ₱499) |
| GROWTH | Growth | PREMIUM | 3 | 10 | 12 | ₱1,999 |
| SCALE | Scale | PREMIUM | 10 | 40 | 20 | ₱4,999 |

**Subscription (Luxe)**

```json
{
  "organizationId": "org_luxe",
  "planCode": "GROWTH",
  "status": "ACTIVE",
  "stripeCustomerId": "cus_xxx",
  "stripeSubscriptionId": "sub_xxx",
  "currentPeriodEnd": "2026-10-03T00:00:00.000Z"
}
```

### Normalization / anti-corruption checklist

- [ ] Single source of truth for tier: **Subscription.plan → Plan.listingTier** syncs `Organization.listingTier` via webhook (never edit tier in UI alone).
- [ ] Enforce limits in server actions (`count` locations/staff/photos vs plan).
- [ ] Snapshot prices on `AppointmentService` (already done).
- [ ] Unique constraints: `(org,user)` membership, `(org,slug)` category, appointment+service.
- [ ] Soft-delete; FK `onDelete: Cascade` only where child is worthless without parent.
- [ ] Migrations only forward; never edit applied SQL.

---

## 3) System architecture & tech stack

### Diagram (target)

```text
                    ┌─────────────┐
   Customers        │  CDN / Edge │
   Salon owners ───▶│  Next.js 16 │◀── Better Auth cookies
                    └──────┬──────┘
           Server Actions  │  /api/auth/*  /api/stripe/webhook
                           ▼
              ┌────────────────────────┐
              │ Domain services (lib/)  │
              │ booking, catalog,      │
              │ listing, billing       │
              └───────────┬────────────┘
                          ▼
              ┌────────────────────────┐
              │ Prisma 7 + Postgres    │
              │ (Supabase pooler)      │
              └───────────┬────────────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
   Object storage    Stripe Billing    Observability
   (R2/S3)           Checkout+Portal   Sentry + logs
```

### Stack recommendations

| Concern | Choice | Why |
|---------|--------|-----|
| App | Next.js App Router + Server Actions | Already in place |
| DB | Postgres + Prisma 7 | Existing; exclusion constraints |
| Auth | Better Auth | Existing |
| Billing | **Stripe Billing + Checkout (`mode: subscription`) + Customer Portal** | SaaS listing fees; no Connect yet |
| Tax | Stripe Tax **only after PH/registration setup** | Don’t enable `automatic_tax` blindly |
| Cache | `unstable_cache` / `cacheTag` for marketplace catalogs; revalidate on mutate | Home is force-dynamic today — too hot |
| Rate limit | Redis / Upstash for auth + checkout | Replace in-memory Map |
| Media | Cloudflare R2 or S3 + signed URLs | Stop disk corruption on deploy |
| Monitoring | Sentry + Vercel/host metrics + Stripe Dashboard | Error + revenue |

### Approaches considered (billing)

| Approach | Pros | Cons |
|----------|------|------|
| **A. Platform subscriptions (recommended)** | Matches “business listing page”; simple; funds Premium features | No customer→salon payouts yet |
| B. Stripe Connect first | Marketplace deposits | KYC, complexity; pay-at-salon already works |
| C. Manual invoices | Zero eng | Doesn’t scale; no self-serve conversion |

**Recommendation:** Approach A now; Connect later if online deposits become a product goal.

---

## 4) Frontend component library & UX patterns

### Design principles (symmetric & lively, not noisy)

- One composition per viewport; brand-first on marketing surfaces.
- Marketplace cards: fixed vertical rhythm — media → name → main service → city · area → CTA.
- Motion: 2–3 intentional transitions (hover lift on cards, preview fade in editor, checkout success).
- Avoid purple-gradient / cream-serif / broadsheet AI clichés; keep light theme + Manila warmth (existing zinc + accent for Premium).
- Cards only for interactive units (listing card, plan card, booking step).

### Component library outline

```text
primitives/     Button, Input, Select, Alert (from lib/ui.ts tokens)
layout/         PageHeader, SiteHeader, Section, SplitPane
listing/        ListingCard, ListingCardMedia, ListingLocationLine, ListingThemeProvider
marketplace/    CategoryChips, ServiceChips, AreaFilter, AvailabilityResults
storefront/     StorefrontSections, ServicePicker, BookingCart
billing/        PlanCard, PricingTable, BillingStatusBanner, CheckoutButton
editor/         ListingEditorClient (existing), LivePreview
empty/          EmptyState
```

### Key UX patterns

1. **Progressive disclosure** — STANDARD sees upgrade prompts; PREMIUM sees full editor.
2. **Live preview → commit** — already in listing editor; reuse for billing “plan preview”.
3. **Trust blocks** — real area names, pay-at-salon honesty, salon phone on storefront.
4. **Mobile-first filters** — sticky search bar; chips scroll horizontally.
5. **Symmetric pricing page** — 3 equal-height plan columns; Growth highlighted as recommended.

---

## 5) Backend API design

Prefer **server actions** for app mutations; HTTP only for auth + webhooks.

### AuthN / AuthZ

| Gate | Use |
|------|-----|
| Session cookie (Better Auth) | All signed-in routes |
| `requireUser` | Customer dashboard |
| `requireActiveOrgAdmin` | Billing, listing editor, catalog |
| Webhook Stripe signature | `/api/stripe/webhook` only |

### Billing actions / endpoints

| Endpoint / action | Method | Auth | Notes |
|-------------------|--------|------|-------|
| `createCheckoutSessionAction(planCode, interval)` | SA | Org owner | Checkout Session `mode: subscription`; omit `payment_method_types` |
| `createBillingPortalAction()` | SA | Org owner | Customer Portal return URL |
| `GET/POST /api/stripe/webhook` | HTTP | Stripe sig | Idempotent via `StripeEvent` |
| `getBillingState(orgId)` | lib | Admin | Plan, status, limits, listingTier |

### Pseudo checkout

```ts
// Do NOT set payment_method_types — dynamic PMs from Dashboard
const session = await stripe.checkout.sessions.create({
  mode: "subscription",
  customer: stripeCustomerId,
  line_items: [{ price: plan.stripePriceMonthlyId, quantity: 1 }],
  success_url: `${base}/dashboard/admin/billing?success=1`,
  cancel_url: `${base}/pricing`,
  client_reference_id: organizationId,
  metadata: { organizationId, planCode },
  subscription_data: {
    trial_period_days: 14,
    metadata: { organizationId, planCode },
  },
  // integration_identifier: `bb-pricing-${random8}` // when on API ≥ 2026-03-25.dahlia
});
```

### Rate limiting

| Surface | Limit |
|---------|--------|
| `/api/auth/*` | 10/min/IP (existing; move to Redis) |
| Checkout session create | 5/min/org |
| Photo upload | 20/hour/org |
| Public book | 30/min/IP |

### Error handling contract

```ts
type ActionFormState = { error?: string }; // existing
// HTTP APIs (webhooks/public later):
// { success: true, data } | { success: false, error: string, code?: string }
```

Map Stripe errors to user-safe messages; log full error server-side.

---

## 6) Business subscription / listing page

### Route

`/pricing` (public) + `/dashboard/admin/billing` (owner)

### Page structure (wireframe)

```text
[ BeautyBook wordmark — hero-level ]
Grow your salon on Manila’s booking marketplace
One short line: Get discovered. Fill chairs. Look premium.

[ Starter ]     [ Growth ★ recommended ]     [ Scale ]
 features         features                     features
 CTA              Start 14-day trial           Contact / CTA

Social proof strip (salon count, areas covered) — BELOW fold
FAQ (pay-at-salon, cancel anytime, photos)
```

### Copy outline

**Headline:** Get found by Manila clients who are ready to book.  
**Sub:** BeautyBook listings put your services, area, and availability in front of real demand—without building your own site.  
**Starter:** Essential listing — 1 location, core booking tools.  
**Growth:** Premium listing — multi-photo gallery, custom theme, marketplace boost, listing editor.  
**Scale:** Multi-branch teams — higher staff/location caps, priority support.  
**CTA Growth:** Start free trial → Checkout → return to billing dashboard.  
**Honesty:** Customers still pay at the salon (until online payments ship).

### Onboarding flow

1. `/onboarding` create org (existing) → Starter/trial.
2. Soft gate: publish to marketplace requires verified phone + ≥1 service + ≥1 schedule.
3. In-product upgrade banners when hitting photo/staff limits or viewing Premium editor locked state.
4. Checkout → webhook → set `Subscription` + sync `listingTier` / `photoLimit`.

---

## 7) Research synthesis, personas, psychology (ethical)

### Competitive landscape (Manila / similar)

| Pattern | Insight for BeautyBook |
|---------|------------------------|
| Fresha / Booksy / local FB groups | Trust = reviews + real photos + clear area |
| Marketplace noise | Symmetric cards + filters reduce decision fatigue |
| SaaS salon tools | Owners fear locked-in complexity — trial + pay-at-salon lowers risk |
| Premium badges | Work when tied to visible quality (photos/theme), not vanity |

### Personas

1. **Maya — Salon owner (Makati, 4 staff)** — Wants more weekday bookings; weak Instagram conversion; needs easy listing + photos.
2. **Alex — Branch manager** — Needs multi-location schedules; hates double-bookings (already mitigated by EXCLUDE).
3. **Rica — Customer (BGC)** — Searches “nails near me Saturday 2pm”; needs availability honesty and clear prices in PHP.

### Ethical engagement tactics

| Tactic | Use | Avoid |
|--------|-----|--------|
| Social proof | “Salons in Makati accepting bookings this week” (true counts) | Fake scarcity timers |
| Default recommended plan | Highlight Growth with clear why | Dark-pattern pre-checked annual |
| Progress cues | Onboarding checklist | Guilt-tripping cancel flows |
| Reciprocity | 14-day trial of Growth features | Hidden auto-charge without notice |
| Consistency | Preview matches live card | Bait-and-switch Premium |

---

## 8) Implementation roadmap (step-by-step)

### Phase 4A — Foundation (week 1–2)

1. Add `Plan`, `Subscription`, `StripeEvent`, `OrganizationSettings` migration.
2. Seed three plans; map STARTER→STANDARD, GROWTH/SCALE→PREMIUM.
3. `lib/billing.ts` — get/sync limits; `assertWithinPlanLimits`.
4. Stripe products/prices in Dashboard (separate Product per plan).
5. Webhook route + idempotency; sync listingTier.

### Phase 4B — Monetization UX (week 2–3)

6. `/pricing` page + PlanCard components.
7. Checkout + Customer Portal actions.
8. `/dashboard/admin/billing` status + upgrade/downgrade.
9. Lock Premium editor behind active Growth/Scale (or trial).
10. E2E: checkout test mode; verify webhook; isolation still green.

### Phase 4C — Hardening (week 3–4)

11. R2/S3 media migration.
12. Redis rate limits.
13. Sentry + basic uptime.
14. `unstable_cache` marketplace lists with tagged revalidation.

### Later

15. Reviews, invites, geo, Connect deposits (only if product requires money routing).

---

## 9) 90-day optimization plan

| Days | Focus | Experiments |
|------|--------|-------------|
| 1–30 | Instrument + pricing launch | Funnel: visit → signup → publish → trial → paid; A/B pricing headline |
| 31–60 | Activation | Checklist completion rate; photo upload Nudge; area completeness |
| 61–90 | Retention & trust | Cancel reasons; review MVP; marketplace CTR by Premium vs Standard |

**Continuous improvement process**

1. Weekly: review Sentry + Stripe failed payments + booking error rate.  
2. Biweekly: one UX experiment (copy or CTA only).  
3. Monthly: plan-limit friction report (which limits block owners).  
4. Quarterly: schema/index review (`EXPLAIN` on marketplace queries).

---

## 10) Success metrics & monitoring

| Metric | Target (90d) | Source |
|--------|--------------|--------|
| Published orgs | +30% MoM early stage | DB |
| Trial→paid conversion | ≥20% | Stripe |
| Marketplace → book start CTR | ≥12% | Analytics |
| Booking completion rate | ≥60% of starts | DB |
| Premium card CTR vs Standard | ≥1.3× | Analytics |
| p95 marketplace TTFB | <800ms | Host |
| Webhook processing success | ≥99.5% | Logs |
| Auth abuse (429 rate) | Stable | Middleware |

**Monitoring plan:** Sentry (errors), host metrics (latency), Stripe Dashboard (MRR, churn), weekly SQL verify scripts (`npm run verify`), Playwright smoke on pricing + book.

---

## 11) Deliverable index

| ID | Deliverable | Location in this doc |
|----|-------------|----------------------|
| a | DB schema + examples | §2 |
| b | Architecture + stack | §3 |
| c | Component library + UX | §4 |
| d | API / auth / rate limit / errors | §5 |
| e | Subscription/listing page + copy | §6 |
| f | Research, personas, 90-day plan | §7–9 |
| g | Metrics + monitoring | §10 |

---

## Open decision (approve before build)

**Billing model:** Platform subscriptions for salon listing plans (Approach A), with Growth unlocking current Premium listing features. Stripe Tax only after registrations are configured for target markets (e.g. PH).

Confirm to proceed to an implementation plan (`docs/superpowers/plans/…`) and Phase 4A coding — or request changes (pricing amounts, free Starter vs paid, Connect-first, etc.).
