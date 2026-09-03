# Listing Customization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship symmetric marketplace listing cards plus an opt-in Premium listing editor (photos, theme, layout, presets) with live preview and org-admin-only writes.

**Architecture:** Organization-scoped listing fields (`listingTheme`, `storefrontLayout`, `listingPresets`, `photoLimit`) plus `ListingPhoto` rows; modular `lib/listing-*` helpers; `/dashboard/admin/listing-editor` client with draft state; server actions gated by `requireActiveOrgAdmin` and `ListingTier`.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 7, Better Auth, Tailwind v4, Zod, `@hello-pangea/dnd`, Playwright

## Global Constraints

- Multi-tenant: every mutation scopes to session org; never trust client org id.
- `strict: true` TypeScript; no `any`.
- Server actions for mutations; `revalidatePath` after writes.
- Prices via `formatPrice` (PHP); Manila `city`/`area` on cards.
- Premium features server-enforced even if UI is bypassed.
- Pin Prisma 7.x; schema changes require migrations.

---

### Task 1: Schema & migrations

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260903130000_listing_customization/migration.sql`
- Create: `prisma/migrations/..._listing_photos` (photo model / backfill as needed)

**Interfaces:**
- Produces: `Organization.listingTier`, `photoLimit`, `listingTheme`, `storefrontLayout`, `listingPresets`; `ListingPhoto`; `Location.city`

- [x] **Step 1:** Add `ListingPhoto` + org listing fields + `Location.city`
- [x] **Step 2:** Migration + backfill from `coverImageUrl` / `galleryUrls`
- [x] **Step 3:** `npx prisma generate` / migrate deploy on hosted DB

---

### Task 2: Domain libraries

**Files:**
- Create: `lib/listing.ts`, `lib/listing-theme.ts`, `lib/listing-layout.ts`, `lib/listing-gallery.ts`, `lib/listing-editor.ts`, `lib/listing-gallery-sync.ts`
- Create: `lib/validations/listing.ts`, `lib/validations/listing-editor.ts`

**Interfaces:**
- Produces: `isPremiumListing`, `resolveListingTheme`, `parseStorefrontLayout`, `effectivePhotoLimit`, `getListingEditorState`, Zod parsers

- [x] **Step 1:** Theme parse/resolve + CSS vars
- [x] **Step 2:** Layout section allow-list + defaults
- [x] **Step 3:** Photo limit helpers (1 / 6 / max 20)
- [x] **Step 4:** Editor state loader + draft Zod schema

---

### Task 3: Symmetric ListingCard UI

**Files:**
- Create: `components/listing/ListingCard.tsx`, `ListingCardMedia.tsx`, `ListingLocationLine.tsx`, `ListingThemeProvider.tsx`
- Modify: `components/booking/BusinessCard.tsx`, marketplace/search result components

**Interfaces:**
- Consumes: `ListingCardData`, `resolveListingTheme`
- Produces: Card showing name, main service, city · area; premium theme + photo badge

- [x] **Step 1:** Implement symmetric card layout
- [x] **Step 2:** Wire marketplace / search / home to `ListingCard`
- [x] **Step 3:** Preview mode (`preview` prop disables navigation)

---

### Task 4: Storefront modular sections

**Files:**
- Modify: `app/s/[orgSlug]/page.tsx`, `storefront-sections.tsx`

**Interfaces:**
- Consumes: `parseStorefrontLayout(org.storefrontLayout)`
- Produces: Ordered section render for public viewers

- [x] **Step 1:** Map section ids → components
- [x] **Step 2:** Apply theme via `ListingThemeProvider`

---

### Task 5: Listing editor + server actions

**Files:**
- Create: `app/dashboard/admin/listing-editor/page.tsx`, `listing-editor-client.tsx`, `actions.ts`
- Modify: admin nav / settings for link + tier controls

**Interfaces:**
- Consumes: `getListingEditorState`, gallery/theme/layout helpers
- Produces: `saveListingCustomizationAction`, photo CRUD, presets, `extendPhotoLimitAction`

- [x] **Step 1:** Split-pane editor with live card/storefront preview
- [x] **Step 2:** DnD for photos and sections (`@hello-pangea/dnd`)
- [x] **Step 3:** Tier-gated actions + revalidation
- [x] **Step 4:** Draft-aware presets (save current draft theme/layout)

---

### Task 6: Seed, verify, e2e

**Files:**
- Modify: `prisma/seed.ts`, `prisma/seed-extra-orgs.ts`
- Create: `scripts/verify/listing-editor.ts`, `e2e/listing-editor.spec.ts`
- Modify: `scripts/verify/run-all.ts`

**Test cases:**
1. Cards render `Manila · {area}`
2. Premium storefront shows Gallery + captions
3. Admin can open listing editor
4. Premium owner saves accent; card border updates
5. Verify script validates theme/layout/photos for published orgs

- [x] **Step 1:** Seed Luxe as PREMIUM with gallery + Warm preset
- [x] **Step 2:** Verify script
- [x] **Step 3:** Playwright listing-editor suite

---

### Task 7: Docs & sprint checklist

**Files:**
- Create: `docs/superpowers/specs/2026-09-03-listing-customization-design.md`
- Create: `docs/superpowers/plans/2026-09-03-listing-customization.md` (this file)

#### 4-hour sprint runway (iterative previews)

| Hour | Focus | Preview checkpoint |
|------|--------|--------------------|
| 0–1 | Schema + libs + ListingCard symmetry | Marketplace grid: all cards aligned |
| 1–2 | Photo model + STANDARD/PREMIUM media | Luxe shows +N photos; demo shows single thumb |
| 2–3 | Editor shell + theme live preview | Admin changes accent → preview updates |
| 3–4 | DnD layout, presets, e2e/verify, bugfix | Save → public card/storefront match draft |

#### Risks

| Risk | Mitigation |
|------|------------|
| Data leak across orgs | `requireActiveOrgAdmin` + org-scoped photo queries |
| STANDARD bypassing UI | Server tier checks on every premium action |
| JSON schema drift | Zod parse on read/write; defaults on failure |
| Local upload durability | Document as MVP; follow-up: Supabase Storage |
| DnD a11y | Prefer keyboard-friendly `@hello-pangea/dnd` |

---

## Spec coverage check

| Spec requirement | Task |
|------------------|------|
| Symmetric card fields | Task 3 |
| Premium multi-photo + captions | Tasks 1, 5 |
| Colors / font scale | Tasks 2, 5 |
| Reorder storefront sections | Tasks 4, 5 |
| Presets | Task 5 |
| Admin vs viewer | Task 5 + admin layout |
| Live preview → commit | Task 5 |
| Tests | Task 6 |
