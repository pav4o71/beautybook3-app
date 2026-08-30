# SaaS Next Steps (after Phase 1 merge)

Phase 1 (multi-tenant foundation) is implemented in PR `feat/saas-tenancy-upgrade`. This doc tracks what comes next.

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

## Phase 2 — Multi-location & marketplace depth

| Item | Why | Notes |
|------|-----|-------|
| Multiple locations per org | Real salons have branches | UI to add/switch locations; booking picks location |
| Wire `components/booking/*` stubs | Origin added marketplace UI shells | Align with `Organization` / `priceCents` types |
| Marketplace filters (area, category) | Discovery UX | Defer geo until location addresses are richer |
| Org invites (email link) | Team growth | `OrganizationMember` already exists |

## Phase 3 — Hosted Supabase alignment

| Item | Why | Notes |
|------|-----|-------|
| Apply migrations B/C on hosted DB | Pooler DDL failed on FK/index | Follow [`docs/supabase-migration-runbook.md`](./supabase-migration-runbook.md) |
| Point staging `DATABASE_URL` at Supabase | Match production | Session pooler URI per `AGENTS.md` |
| `VERIFY_ALLOW_REMOTE=1` on staging | Safe verify against hosted DB | Never on production without care |

## Phase 4 — Billing (deferred)

- Stripe Connect or per-org subscriptions
- Plan limits (staff count, locations)
- Not started — keep pay-at-salon copy until then

## Phase 5 — Hardening

- [ ] Audit every Prisma query for `organizationId` filter
- [ ] Playwright: cross-org isolation test (user A cannot book org B admin routes)
- [ ] Rate-limit tuning per route in production
- [ ] Migrate `middleware.ts` → Next.js `proxy` when stable (deprecation warning)

## Local dev quick start

```bash
docker start beautybook3-pg
export DATABASE_URL="postgresql://beautybook:beautybook@localhost:5433/beautybook?sslmode=disable"
export BETTER_AUTH_SECRET="local-dev-better-auth-secret-min-32-chars"
export BETTER_AUTH_URL="http://localhost:3000"
npm run dev
```

Demo logins: `demo@beautybook.local` / `Demo1234!` (admin), `customer@beautybook.local` / `Demo1234!`
