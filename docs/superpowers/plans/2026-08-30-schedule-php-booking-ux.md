# Schedule + PHP + Booking UX Implementation Plan

> **For agentic workers:** Run Agents 1–3 in parallel, then Agent 4 (schedule UI) and Agent 5 (catalog polish) after merges.

**Goal:** PHP pricing, visible pay-at-salon booking UX, and slot engine that respects TimeOff.

**Architecture:** No schema migration. `priceCents` stays integer centavos. `CONFIRMED` = slot held, pay at salon. Schedule logic in `lib/schedule.ts`; booking consumes it.

**Tech Stack:** Next.js 16, Prisma 7.10, Better Auth, Tailwind v4

## Global Constraints

- Prisma 7.10.0
- PHP via `Intl` `currency: "PHP"`, locale `en-PH`
- No Stripe / no Payment table
- Admin-only schedule editing (Agent 4, later)

---

## Agent 1 — PHP currency

- `lib/format.ts` → PHP
- `lib/catalog.ts` → `parsePesoToCentavos`
- Admin labels Price (PHP)
- Reseed realistic PHP amounts

## Agent 2 — Booking UX

- `/dashboard/appointments` with pay-at-salon copy
- Nav link + post-book redirect
- Stronger confirmation styling

## Agent 3 — Schedule + TimeOff logic

- `lib/schedule.ts` helpers
- Wire TimeOff into `getAvailableSlots` and `createAppointment`

## Agent 4 — Schedule admin UI (later)

## Agent 5 — Catalog polish (later)

## Agent 6 — Tests (later)
