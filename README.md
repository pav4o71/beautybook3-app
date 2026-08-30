# BeautyBook

Salon booking app: Next.js App Router, TypeScript, Tailwind, Prisma 7 + PostgreSQL (Supabase), Better Auth (email/password). Pay at salon — no payment table.

## Stack roles

| Piece | Tool | Notes |
|-------|------|--------|
| Database host | **Supabase Postgres** | Storage only — do not use Supabase Auth for login |
| Schema & migrations | **Prisma CLI** | `prisma/schema.prisma` + `prisma/migrations/` |
| Login | **Better Auth** | `/api/auth/*`; passwords on `Account.password` |
| Overlap protection | **Postgres exclusion constraint** | `Appointment_staff_no_overlap` (raw SQL migration) |

Do **not** run `supabase db push` for app tables — Prisma owns the schema.

## Setup

1. Copy `.env.example` → `.env`.
2. Set **`DATABASE_URL`** to the Supabase **session pooler** URI (port **5432**, host `*.pooler.supabase.com`). This project uses the `beautybook_prisma.[PROJECT-REF]` user — it works on the pooler, not on the direct `db.*.supabase.co` host.

   From [Supabase → beautybook → Database](https://supabase.com/dashboard/project/jjkmelcuwefymvsmxxkd/settings/database), use **Connection pooling → Session mode → URI** (not Transaction mode on port 6543, not Direct unless you switch to `postgres.[REF]`).
3. Set `BETTER_AUTH_SECRET` (long random string) and `BETTER_AUTH_URL` (`http://localhost:3000` in dev).
4. Install and generate client:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
```

## Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `demo@beautybook.local` | `Demo1234!` |
| Customer | `customer@beautybook.local` | `Demo1234!` |

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in at `/login`.

### Verify & E2E

```bash
# Hosted Supabase: verify scripts mutate DB — set in .env first:
# VERIFY_ALLOW_REMOTE=1
npm run verify        # format, seed counts, slots, booking, appointments
npm run test:e2e      # Playwright (seeds DB first; starts dev server when CI=1)
```

## Key routes

- `/` — search salons (category, service, area, date)
- `/s/{orgSlug}` — salon storefront: catalog, hours, multi-service cart
- `/s/{orgSlug}/book` — pick staff and a combined time slot (no login required)
- `/onboarding` — create a new business (authenticated)
- `/dashboard/book` — customer booking (active org context)
- `/dashboard/appointments` — my appointments
- `/dashboard/admin/appointments` — today's board (complete / no-show / cancel)
- `/dashboard/admin/settings` — business profile and marketplace visibility
- `/dashboard/admin/*` — catalog, staff, schedules (org admin only)

Public flow: `/` → `/s/{orgSlug}` → `/s/{orgSlug}/book`. Availability search **Book** still deep-links to `/s/{orgSlug}/book` with a single `serviceId`.

## Auth (Better Auth)

```ts
import { prisma } from "@/lib/prisma";
import { signIn, signOut, useSession } from "@/lib/auth-client";
```

Server gates: `requireUser()`, `requireAdmin()` in `lib/`.

## Migrations on Supabase

- Use **`npx prisma migrate deploy`** on the hosted database (not `migrate dev` — no shadow DB on Supabase).
- With the **pooler** URL, most migrations apply normally. If deploy fails with `must be owner of table` (DDL on pooler), run that migration’s SQL in the Supabase SQL editor, then `npx prisma migrate resolve --applied <name>`.
- Optional: a **direct** `postgres.[REF]` URI on `db.*.supabase.co` avoids pooler DDL limits; this repo defaults to the pooler for simplicity.
- **`20260830034500_appointment_staff_no_overlap`**: enables `btree_gist` and adds an exclusion constraint. On deploy it **deletes the newer row** in each overlapping non-cancelled pair (one-time cleanup). Re-applying on a DB with overlaps has the same effect — review before deploy on production data.
- **`20260830100000`–`20260830100200` (tenancy)**: adds `Organization`, `Location`, `OrganizationMember`, and scopes catalog/booking tables. Migration C backfills `beautybook-demo` and enforces `NOT NULL`. If pooler DDL fails with `must be owner of table`, run migrations B and C SQL in the Supabase SQL editor, then `npx prisma migrate resolve --applied <name>` for each.
- **`20260830183000_salon_profile_and_appointment_service_unique`**: adds `Organization.description` / `phone`, `Location.phone`, and a unique constraint on `AppointmentService(appointmentId, serviceId)` (deletes duplicate join rows, keeping the lowest id).

## Learn more

- [Next.js docs](https://nextjs.org/docs)
- [Prisma docs](https://www.prisma.io/docs)
- [Better Auth](https://www.better-auth.com/docs)
