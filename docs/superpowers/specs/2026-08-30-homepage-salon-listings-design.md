# Homepage salon listings

**Status:** Approved by product direction (layout C, cover URL + disk upload)  
**Date:** 2026-08-30

## Goal

Opening the site shows discovery immediately: category chips, a horizontal row of matching services, then salon cards with cover images. Date/time still reveals real staff availability.

## Layout (`/`)

1. Title + short subtitle  
2. Category chips in one row (All, Hair, Nails)  
3. Service-name chips in one horizontal row (unique names for the active category/area)  
4. Area, date, time filters  
5. No date → salon cards with covers (`BusinessCard`)  
6. Date set → existing availability cards and book deep-links  

`/search` and `/marketplace` redirect to `/` with the same query string.

## Schema

```prisma
model Organization {
  coverImageUrl String?  // public path or http(s) URL
}
```

No image columns on Location or Service. `Staff.photoUrl` stays unused.

## Images

- Seeded paths: `/images/salons/{slug}.jpg` (committed photos)  
- Owner paste URL **or** upload JPEG/PNG/WebP (max 2MB; Server Action `bodySizeLimit` 3mb)  
- Uploads written to `public/uploads/orgs/{organizationId}/cover.{ext}`  
- Disk uploads need a persistent filesystem (local Docker / a VPS). They will not survive serverless deploys.  
- Not Supabase Storage 

## Filters

- `category`, `area`, `date`, `time` unchanged  
- `service` = exact service name chip (not org-specific `serviceId`)  
- Changing category clears `service`  
- Availability may still use `serviceId` for a specific offering  

## Out of scope

- Cloudflare R2 / S3  
- Geo/maps, Stripe, org invites  
