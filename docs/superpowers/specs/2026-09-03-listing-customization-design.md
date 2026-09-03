# Business Listing Customization — Design Spec

**Date:** 2026-09-03  
**Status:** MVP implemented on `cursor/listing-customization-ea48` (PR #21)  
**Product:** BeautyBook3 multi-tenant salon marketplace (Manila / PHP)

## Problem

Marketplace listing cards were uneven: missing standardized location display, inconsistent media treatment, and no owner-facing way to customize a Premium listing like a small embedded website builder. Viewers needed a polished read-only card; owners/admins needed live-preview editing with tier gates.

## Goals

1. Symmetric listing cards focused on: **main service**, **business name**, **city**, **area**.
2. Optional **Premium Listing** mode: multi-photo gallery, theme (colors / font scale), storefront section reorder, named presets.
3. Editor mode only for org **OWNER / ADMIN**; public viewers get read-only themed cards and storefronts.
4. Live preview → commit workflow (draft in client, save via server actions).

## Non-goals (MVP)

- Full visual page builder / arbitrary HTML widgets
- Paid billing for Premium (tier is data-driven; upgrade UX later)
- CDN / S3 object storage (local `public/uploads` for MVP)
- Cross-org template marketplace

## Recommended approach

**Org-scoped listing profile + modular editor** (chosen over a separate “Listing” entity or full CMS):

| Approach | Pros | Cons |
|----------|------|------|
| **A. Fields on `Organization` + `ListingPhoto` (chosen)** | Fits existing tenant model; minimal joins; reuses requireOrgAdmin | JSON for theme/layout/presets needs Zod parsing |
| B. Separate `Listing` 1:1 with org | Cleaner boundary if listings diverge | Extra migration + dual IDs for little gain |
| C. Headless CMS / block editor | Maximum layout freedom | Overkill for 4h sprint; hard to keep cards symmetric |

## Architecture overview

```
Marketplace / Search / Home
        │
        ▼
  ListingCard (symmetric, tier-aware theme)
        │
        ▼
  /s/[orgSlug] StorefrontSections (layout order from JSON)

Owner/Admin
  /dashboard/admin/listing-editor
        │  draft state (client)
        │  live preview pane
        ▼
  Server actions (requireActiveOrgAdmin + tier gates)
        ▼
  Prisma: Organization + ListingPhoto
```

- **Domain libs:** `lib/listing.ts`, `lib/listing-theme.ts`, `lib/listing-layout.ts`, `lib/listing-gallery.ts`, `lib/listing-editor.ts`
- **Mutations:** colocated server actions (not REST), Zod in `lib/validations/listing-editor.ts`
- **Auth:** `requireActiveOrgAdmin()` — OWNER/ADMIN only
- **DnD:** `@hello-pangea/dnd` (Apache-2.0)

## Data model

### Enum

```prisma
enum ListingTier { STANDARD PREMIUM }
```

### Organization (listing fields)

| Field | Type | Notes |
|-------|------|--------|
| `listingTier` | `ListingTier` | Gates premium features |
| `photoLimit` | `Int` | Default 1 / 6; admin can extend to ≤20 |
| `listingTheme` | `Json` | `{ backgroundColor, textColor, accentColor, fontScale }` |
| `storefrontLayout` | `Json` | Ordered section ids |
| `listingPresets` | `Json` | Up to 5 named `{ id, name, theme, layout, savedAt }` |
| `featuredServiceId` | FK | “Main service” on card |
| `coverImageUrl` / `galleryUrls` | legacy sync | Kept in sync from `ListingPhoto` for compat |

### ListingPhoto

| Field | Type |
|-------|------|
| `id`, `organizationId`, `url`, `caption?`, `sortOrder` | |

### Location

| Field | Notes |
|-------|--------|
| `city` | Default `"Manila"` — shown on cards |
| `area` | Existing Manila area filter |

## API contract (server actions)

All mutations require org admin membership. Premium-only actions reject STANDARD with an actionable error.

| Action | Auth | Tier | Behavior |
|--------|------|------|----------|
| `saveListingCustomizationAction` | Admin | Theme/layout/social premium-only | Persist draft → revalidate → redirect `?saved=1` |
| `uploadListingPhotoAction` | Admin | Premium | Enforce `effectivePhotoLimit` |
| `reorderListingPhotosAction` | Admin | Premium | Transactional sortOrder update |
| `updatePhotoCaptionAction` | Admin | Org-scoped | Caption ≤120 chars |
| `deleteListingPhotoAction` | Admin | Org-scoped | Delete row + local file if owned |
| `saveListingPresetAction` | Admin | Premium | Cap 5 presets; optional draft theme/layout |
| `applyListingPresetAction` | Admin | Premium | Write theme+layout from preset |
| `extendPhotoLimitAction` | Admin | Premium | `+3` up to `MAX_PHOTO_LIMIT` (20) |

Public reads: marketplace / search / storefront load org-scoped published listings only (existing marketplace queries).

## UI component tree

```
ListingCard
├── Premium badge (tier)
├── ListingCardMedia (cover + “+N photos”)
├── Business name
├── Tagline (optional)
├── Featured service + formatPrice
└── ListingLocationLine (city · area)

ListingEditorClient (/dashboard/admin/listing-editor)
├── Controls column
│   ├── Tier / photo limit
│   ├── Theme (bg, text, accent, font scale) [premium]
│   ├── Photos DnD + captions [premium]
│   ├── Storefront section DnD [premium]
│   ├── Presets save/apply [premium]
│   └── Save listing
└── Preview pane
    ├── Card | Storefront toggle
    ├── ListingCard (preview=true)
    └── Themed storefront section list
```

## Access & security

- Editor routes under `/dashboard/admin/*` → `requireAdmin` / `requireActiveOrgAdmin`
- Never trust client `organizationId`; always derive from session org context
- Tier gates on server (client UI only hides controls)
- Image upload via existing cover helpers (type/size validation)
- Hex colors validated with Zod / regex; invalid → defaults
- Standard tier cannot persist custom theme, layout, or social URLs

## Acceptance criteria (MVP)

1. Every marketplace card shows main service (or empty placeholder), name, city · area, consistent spacing.
2. STANDARD: at most one thumbnail; no theme/layout editor controls that persist.
3. PREMIUM: multi-photo upload/reorder/captions; theme colors on card; storefront sections reorderable.
4. Live preview updates before Save; Save commits and revalidates `/`, `/marketplace`, `/search`, `/s/{slug}`.
5. Non-admins cannot open editor or mutate via actions.
6. Verify script + Playwright listing-editor e2e pass.

## Example admin flow

1. Sign in as `owner@luxe-hair.local` / `Demo1234!`
2. Open **Admin → Listing**
3. Set accent `#0F766E`, reorder gallery, caption “Salon exterior”
4. Preview Card → Save listing
5. Public home card for Luxe shows teal border + multi-photo badge; `/s/luxe-hair-lounge` uses gallery-first layout

## Card modes (concise)

**Standard**

```
┌─────────────────────────┐
│ [cover thumb]           │
│ Glow Studio             │
│ ₱1,200 Cut & Blow Dry   │
│ Manila · Makati         │
│ [Book]                  │
└─────────────────────────┘
```

**Premium**

```
┌─────────────────────────┐ ← accent border / custom bg+text
│ Premium          [cover]│
│                 +3 photos│
│ Luxe Hair Lounge        │
│ ₱2,500 Balayage         │
│ Manila · BGC            │
│ [Book]                  │
└─────────────────────────┘
```

## Attribution

- `@hello-pangea/dnd` — Apache License 2.0 (drag-and-drop for photos & sections)
