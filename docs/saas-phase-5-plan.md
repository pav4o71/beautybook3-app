# Phase 5 — Hardening

**Status:** Complete (2026-08-30)  
**Base:** `main` after PR #7 merged  
**Out of scope:** invites (2D), billing (4), middleware→proxy (defer), rate-limit tuning (defer)

## PR order

| PR | Branch | Scope | Status |
|----|--------|-------|--------|
| #7 | `fix/schedule-staff-location` | Schedule uses `staff.locationId` | Merged |
| #8 | `feat/phase-5a-isolation` | Cross-org E2E | Merged |
| #9 | `feat/phase-5b-staff-location` | Edit staff branch | Merged |
| #10 | `feat/phase-5c-query-audit` | Verify script + fixes | Merged |

## Gates (every PR)

- [x] `npm run build`
- [x] `npm run verify` (CI uses local Postgres)
- [x] `npm run test:e2e` (25 tests)
- [x] Bugbot on branch diff
- [x] `gh pr checks --watch` → merge

## Deliverables

- [x] `e2e/isolation.spec.ts` — Glow owner cannot see demo staff/catalog
- [x] `lib/validations/staff.ts` + staff edit location picker
- [x] `scripts/verify/org-scope.ts` — demo vs Glow `listAdmin*` isolation

## Deferred

- [ ] `middleware.ts` → proxy (Next codemod when stable)
- [ ] Rate-limit per-route tuning (document only)
- [ ] Inactive staff location preserved in edit form when branch deactivated
