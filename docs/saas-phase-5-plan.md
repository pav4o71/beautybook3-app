# Phase 5 — Hardening

**Status:** In progress  
**Base:** `main` after PR #7 merged  
**Out of scope:** invites (2D), billing (4), middleware→proxy (defer), rate-limit tuning (defer)

## PR order

| PR | Branch | Scope | Acceptance |
|----|--------|-------|------------|
| #7 | `fix/schedule-staff-location` | Schedule uses `staff.locationId` | Merge first |
| #8 | `feat/phase-5a-isolation` | Cross-org E2E | Glow owner never sees demo staff |
| #9 | `feat/phase-5b-staff-location` | Edit staff branch | Admin can reassign location |
| #10 | `feat/phase-5c-query-audit` | Verify script + fixes | `npm run verify` passes |

## Gates (every PR)

- [ ] `npm run build`
- [ ] `npm run verify` (CI uses local Postgres)
- [ ] `npm run test:e2e`
- [ ] Bugbot on branch diff
- [ ] `gh pr checks --watch` → merge

## Deferred

- [ ] `middleware.ts` → proxy (Next codemod when stable)
- [ ] Rate-limit per-route tuning (document only)
