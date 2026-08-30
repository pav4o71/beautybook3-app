# SaaS Next Steps (after Phase 1 merge)

Phase 1 (multi-tenant foundation) is implemented in PR #3. Phase 2 (multi-location + marketplace) is complete in PRs #4–#6. Phase 5 (hardening) is complete in PRs #7–#10.

## Completed in Phase 1

- [x] `Organization`, `Location`, `OrganizationMember`, `OrgRole`
- [x] Nullable → backfilled → NOT NULL `organizationId` / `locationId` on catalog & booking models
- [x] Org-scoped libs (`catalog`, `booking`, `schedule`, `appointments`)
- [x] Active org cookie + switcher + `requireActiveOrgContext()` / `requireActiveOrgAdmin()`
- [x] Public routes: `/marketplace`, `/s/[orgSlug]`, `/s/[orgSlug]/book`
- [x] Onboarding (`/onboarding`) + admin business settings
- [x] Zod validation on key server actions
- [x] Middleware security headers + auth rate limit (production only)
- [x] CI: Postgres service, migrate, seed, verify, E2E

See also: [`docs/saas-upgrade-progress.md`](./saas-upgrade-progress.md), [`docs/IMPLEMENTATION-PHASES.md`](./IMPLEMENTATION-PHASES.md).

## Phase 2 — Multi-location & marketplace depth — **complete**

**Plan:** [`docs/saas-phase-2-plan.md`](./saas-phase-2-plan.md)

| PR | Item | Status |
|----|------|--------|
| #4 | Location admin CRUD | Merged |
| #5 | Location switcher + branch-scoped booking | Merged |
| #6 | Marketplace category filters + `BusinessCard` | Merged |

**Deferred:** org invites (2D) — not planned for now.

## Phase 3 — Hosted Supabase alignment — **complete**

| Item | Status |
|------|--------|
| Apply migrations B/C on hosted DB | Done — [`docs/supabase-migration-runbook.md`](./supabase-migration-runbook.md) |
| Staging `DATABASE_URL` at Supabase pooler | Done — smoke-tested 2026-08-30 |
| `VERIFY_ALLOW_REMOTE=1` on hosted | Done |

## Phase 4 — Billing (deferred)

- Stripe Connect or per-org subscriptions
- Plan limits (staff count, locations)
- Not started — keep pay-at-salon copy until then

## Phase 5 — Hardening — **complete**

**Plan:** [`docs/saas-phase-5-plan.md`](./saas-phase-5-plan.md)

| PR | Item | Status |
|----|------|--------|
| #7 | Schedule saves use `staff.locationId` (not admin cookie) | Merged |
| #8 | Cross-org isolation E2E (`e2e/isolation.spec.ts`) | Merged |
| #9 | Staff admin: reassign `locationId` on edit | Merged |
| #10 | `scripts/verify/org-scope.ts` org isolation check | Merged |

**Deferred:**

- [ ] `middleware.ts` → Next.js `proxy` when stable (deprecation warning only)
- [ ] Rate-limit tuning per route in production
- [ ] Staff edit: preserve inactive location in picker (Bugbot follow-up from #9)

## Phase 6 — Search-first marketplace UI (next)

**Plan:** [`docs/saas-phase-6-plan.md`](./saas-phase-6-plan.md)

**Vision:** Landing category search → list services (Hair, Nails, …) → filter by Manila area → pick day/time → see salons with real availability → book at `/s/{slug}/book`.

| PR | Item | Status |
|----|------|--------|
| #12 | `Location.area` migration + `lib/areas.ts` + admin | Merged |
| #13 | Landing search + `/search` service discovery | Merged |
| #14 | Cross-org availability search + book deep-links | In progress |
| #15 | Visual polish + E2E updates | Planned |

**One schema change:** `Location.area` (required for area filter). Everything else is UI + `lib/marketplace` queries.

**Reuse:** `components/booking/*` scaffolds, `lib/ui.ts`, `getAvailableSlots` logic, `BookingForm`.

**Gates:** `npm run build`, `npm run verify`, `npm run test:e2e`

## Local dev quick start

```bash
docker start beautybook3-pg
export DATABASE_URL="postgresql://beautybook:beautybook@localhost:5433/beautybook?sslmode=disable"
export BETTER_AUTH_SECRET="local-dev-better-auth-secret-min-32-chars"
export BETTER_AUTH_URL="http://localhost:3000"
npm run dev
```

Demo logins: `demo@beautybook.local` / `Demo1234!` (admin), `customer@beautybook.local` / `Demo1234!`

Additional marketplace owners: `owner@glow-nails.local`, `owner@luxe-hair.local` (same password).
