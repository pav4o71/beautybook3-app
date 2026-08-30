# Admin Gate + Catalog CRUD + UI Contrast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let ADMIN users manage categories, services, and staff (including StaffService links) via dashboard pages, while fixing dark-mode contrast on booking pickers and confirming appointments as pay-at-salon holds.

**Architecture:** Server actions behind `requireAdmin()` for all mutations; shared validation in `lib/catalog.ts`; shared Tailwind class strings in `lib/ui.ts`; customer-facing pages stay read-only and filter `active: true`. No new Prisma models or REST API routes.

**Tech Stack:** Next.js 16 App Router, Prisma 7.10, Better Auth, Tailwind CSS v4

## Global Constraints

- Prisma 7.10.0 (no Prisma 8 RC)
- Password on `Account.password`, never `User`
- Soft-deactivate services/staff via `active`; no hard-delete when history exists
- Categories: block delete when services still reference category
- Pay at salon: no Stripe; appointment status `CONFIRMED` on book
- No `.env` commits

---

## Tasks

See implementation in codebase; verified via `npm run build` and manual browser checks.
