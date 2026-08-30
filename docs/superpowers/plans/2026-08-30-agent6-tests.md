# Agent 6 — Verification & E2E Tests

> **Status:** Implemented.

**Goal:** Repeatable scripts and Playwright specs for booking, admin, PHP pricing, and schedule logic.

## Verify scripts (`npm run verify`)

- `scripts/verify/format.ts` — PHP formatting
- `scripts/verify/slots.ts` — TimeOff blocks slots; Lena has Saturday hours
- `scripts/verify/seed-counts.ts` — Minimum seeded entities exist
- `scripts/verify/run-all.ts` — Runs all checks

## Playwright (`npm run test:e2e`)

- `e2e/auth.spec.ts` — Admin vs customer login and admin gate
- `e2e/booking.spec.ts` — Book flow → appointments pay-at-salon
- `e2e/catalog.spec.ts` — Services show ₱ prices; admin services page

Requires `npm run prisma:seed` and `.env` with `DATABASE_URL`.
