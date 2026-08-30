# Salon storefront and multi-service booking

**Status:** Implemented (Phase 7)  
**Date:** 2026-08-30

## Goal

Opening a salon shows its catalog. The customer ticks one or more services, then picks staff and a time for a **single combined slot**. Pay-at-salon stays.

## Flow

1. `/` salon cards: **View salon** and **Book now** both go to `/s/{slug}` (optional `?service=Blowout` to pre-check by name).
2. `/s/{slug}`: cover, about, phone, locations, hours derived from staff schedules, services grouped by category with checkboxes.
3. Continue → `/s/{slug}/book?serviceIds=id1,id2`.
4. Availability **Book** still deep-links to `/book` with `serviceId` (treated as a one-item cart).

## Cart rules

- Checkboxes, not radio. Sticky summary: count, total minutes, total PHP.
- Max **6** services; combined duration **240** minutes.
- Staff must offer **every** selected service. If none can: “No staff can do this combination — deselect some services.”
- Duration = sum of `durationMin`; price = sum of `priceCents`. One staff, one block.

## Schema (`prisma/schema.prisma` only)

```prisma
model Organization {
  description String?  // storefront about text
  phone       String?  // public business phone
}

model Location {
  phone String?  // optional branch phone
}

model AppointmentService {
  @@unique([appointmentId, serviceId])
}
```

`prisma/schema-saas.prisma` is **not live**. Hours are derived from `StaffSchedule` (earliest start / latest end per weekday per location). No new hours table or service image upload.

## Out of scope

- Stripe, maps, ratings, org invites, Cloudflare R2
