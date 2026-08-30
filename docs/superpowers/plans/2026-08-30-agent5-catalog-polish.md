# Agent 5 — Catalog CRUD Polish Implementation Plan

> **Status:** Implemented.

**Goal:** Improve admin catalog UX while staying schema-faithful. PHP pricing from Agent 1 is assumed done.

**Architecture:** Extend existing `/dashboard/admin/*` pages. No new models. Server actions stay behind `requireAdmin()`. Add client-side error display where forms currently throw.

**Tech Stack:** Next.js 16 App Router, Prisma 7.10, Tailwind v4

## Global Constraints

- No Prisma schema changes
- `priceCents` integer centavos, PHP display via `formatPrice`
- Soft-deactivate only for services/staff with history
- Category delete blocked when services exist

---

## Scope (in)

### 1. Unified catalog hub (optional layout improvement)

- Add `/dashboard/admin/catalog` redirect or tabbed hub linking Categories | Services | Staff
- **OR** keep separate pages but add cross-links at top of each admin list (“Categories · Services · Staff” breadcrumb row)
- Recommendation: **breadcrumb row only** (YAGNI — no new route)

### 2. Reactivate inactive items

- Services admin: **Activate** button when `active: false`
- Staff admin: **Activate** button when `active: false`
- New server actions: `activateService`, `activateStaff`

### 3. Inline validation feedback

- Wrap admin create forms in small client components that catch server action errors
- Show red banner with message instead of Next.js error overlay
- Pattern: `useActionState` or form `action` with returned `{ error }` (change actions to return errors for create forms only, keep redirect on success)

### 4. Service list polish

- Group by category with headers (already partially done on customer page; mirror in admin)
- Show inactive badge + PHP price + duration on one line
- Empty state when no categories exist (“Create a category first”)

### 5. Staff list polish

- Show schedule summary per row: “Mon–Fri 09:00–17:00” (query `StaffSchedule`, compress weekdays)
- Link **Schedule** already exists — keep it

### 6. Category polish

- Show service count badge
- Disable delete with tooltip text when count > 0 (already disabled; add helper text)

---

## Out of scope

- Drag-and-drop sort order
- Image upload (`photoUrl`)
- Public REST API
- Guest booking

---

## Tasks (for multi-agent split)

| Task | Agent | Files | Depends on |
|------|-------|-------|------------|
| A5.1 Activate actions | 5a | `admin/services/actions.ts`, `admin/staff/actions.ts`, list pages | — |
| A5.2 Form error UI | 5b | client wrappers for category/service/staff create forms | — |
| A5.3 Admin service grouping | 5c | `admin/services/page.tsx` | — |
| A5.4 Staff schedule summary | 5d | `admin/staff/page.tsx` + `lib/schedule.ts` helper | Agent 4 |
| A5.5 Breadcrumb nav | 5e | all admin list pages | — |

Agents **5a, 5b, 5c, 5e** can run in parallel. **5d** after schedule helpers exist (done).

---

## Test plan

1. Deactivate a service → hidden on Book → Activate → visible again with ₱ price
2. Submit invalid price (empty) → inline error, no crash overlay
3. Admin services grouped by Hair / Nails
4. Staff row shows compressed hours; Schedule link works
5. `npm run build` passes

---

## User confirmation

Reply **proceed with Agent 5** to implement all tasks, or specify which tasks to include/exclude.
