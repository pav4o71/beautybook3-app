<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; keep it in the working tree.

<!-- END:nextjs-agent-rules -->

# BeautyBook

BeautyBook is a multi-tenant salon/beauty marketplace and appointment-booking SaaS.

Core stack:

- Next.js App Router and Server Actions
- TypeScript, React, and Tailwind CSS
- Prisma ORM with PostgreSQL
- Better Auth
- Playwright E2E tests

## Canonical repository

The only development target is:

`/home/pav4o71/Projects/beautybook3-current`

The following are historical/read-only recovery material. Never modify, clean, reset, run, or merge them wholesale:

- `/home/pav4o71/Projects/beautybook3`
- `/tmp/beautybook3-preservation`
- `/tmp/beautybook3-ui-historical`

Current repository code, Git history, fetched GitHub state, tests, and migrations are authoritative. Do not rely on old reports when they conflict with source.

## Git workflow

`main` is stable integration. Before changes, fetch and inspect:

```text
git fetch origin
git status --short --branch
git rev-parse HEAD
git rev-parse origin/main
```

Never work directly on `main`. A commit must never be created while checked out on `main`.

Use this workflow:

```text
updated main → feature/* or fix/* → focused change → tests → focused commit
→ push branch → pull request → required CI → review → normal merge
```

Before every commit, verify the branch and review `git status`, `git diff`, `git diff --cached`, and recent history. Never force-push, rebase, reset hard, clean the repository, rewrite main history, blindly resolve conflicts, or automatically delete branches or stashes. Do not bypass GitHub protections.

Preserve pre-existing user files. In particular, `.agents/skills/code-reviewer/SKILL.md` is an untracked duplicate that must remain untouched and uncommitted unless the user explicitly directs otherwise.

Keep one logical issue per PR where practical. Do not mix security fixes with UI redesign, dependency upgrades, or broad documentation cleanup unless inseparable. If a new P0/P1 issue appears outside the requested scope, stop expansion and report it as a separate proposed PR.

## Database safety

Mutation-capable local validation is allowed only after positively proving the target is the disposable local development database:

- host: `localhost` or `127.0.0.1`
- port: `5433`
- database: `beautybook_dev`
- historical local container: `beautybook3-pg`

Never touch Supabase, remote PostgreSQL, or an unknown host/database. Never print `DATABASE_URL`, passwords, API keys, Better Auth secrets, management tokens, or verification/reset tokens. Do not use `prisma migrate dev` or `prisma db push` as improvised fixes. Use the repository migration workflow and read-only status checks where appropriate.

## Tenancy security

`OrganizationMember` is authoritative for tenant membership. `User.role` is not organization authority. Global roles must never substitute for organization membership or organization-admin checks.

Every organization-scoped read and mutation must independently validate every submitted foreign key against the active organization. Treat FormData, query parameters, cookies, and IDs as untrusted. For IDs such as `categoryId`, `serviceId`, `staffId`, and `locationId`, prove both the entity ID and its organization ownership before use. Keep the final mutation tenant-scoped as an additional defense where practical.

Customer users may legitimately have zero organization memberships and must never gain admin access from that state. Never expose another tenant's catalog, staff, locations, appointments, categories, services, schedules, or time-off data.

## Authentication and customer ownership

Better Auth provides email/password signup and login, email verification, password reset, and sessions. Customer signup must not create salon/admin membership. Verification is required before normal password login.

Normal customer appointment access is authorized by `Appointment.customerId == authenticated User.id`, not by email matching. Guest-to-customer linking may occur only after Better Auth has confirmed verified email ownership.

Guest-linking invariants:

- Load the user server-side and require `emailVerified`.
- Use the canonical stored user email with the repository's normalization rules.
- Update only appointments whose `customerId` is null.
- Never reassign an appointment owned by another user.
- Keep linking idempotent and race-safe.

Public guest booking remains supported independently of accounts. The `/b/[token]` management-capability flow must remain independent of customer sessions.

## Management tokens

Management tokens are high-entropy bearer capabilities. Store only the SHA-256 hash. Raw tokens must never be persisted in application records, logged, printed, or stored in rate-limit rows.

Cancellation and rescheduling must re-check the hashed token, appointment status, organization cutoff, and allowed state transition on the server. Preserve race-safe conditional updates and never infer authorization from client-rendered state.

## Booking invariants

Booking must validate organization, location, service, staff, staff-service capability, schedule, time off, future time, the 30-minute booking grid, and collision constraints. Keep organization scoping on all catalog and availability queries.

`Appointment` and `AppointmentService` snapshot customer contact, service name, duration, and price at booking time. These historical snapshots must not be replaced with mutable catalog values. The database staff-overlap constraint is the final concurrency backstop.

## Email and notifications

The `EmailSender` abstraction supports memory, SMTP/Mailpit, and Resend providers. Booking, cancellation, and rescheduling use `NotificationDelivery` with idempotency, claim-token ownership, lease expiry, conditional finalization, attempt tracking, provider timeout, and provider identifiers/errors.

Email failure must not roll back a successfully committed booking unless the specific authentication flow explicitly requires delivery-success semantics. Auth verification/reset bearer URLs must never be persisted or logged. Production requires an explicit provider and a configured `RATE_LIMIT_SECRET`.

## Rate limiting

Use the PostgreSQL `RateLimitBucket` architecture and its atomic fixed-window behavior. Do not add a process-local `Map` limiter for production protection. Rate-limit subjects must be keyed hashes; never store raw phone numbers, management tokens, auth subjects, or comparable identifiers in bucket rows.

## Admin day board

Preserve organization and location isolation, true temporal vertical positioning, the shared 30-minute grid, duration-scaled cards, staff lanes, cancellation/history handling, and walk-in collision protection. Do not replace the true timeline with stacked cards or bypass server authorization in UI flows.

## Testing and validation

Standard validation before a PR:

```text
npm run prisma:generate
npm run lint
npm run build
npm run verify
npm run test:e2e
```

Run mutation-capable validation only against the proven local database above. Determine current test and migration counts from source/runtime; do not copy historical counts. Verification tests must be deterministic across weekday, time-of-day, local, and CI execution. Security tests must exercise production code paths or the production domain helper used by them, not duplicate the validation logic in the test.

## Current investigation starting points

Before new roadmap work, check current code and tests for:

- zero-organization customer public-booking redirect behavior
- authentication email-delivery failure handling
- real Better Auth verification/reset lifecycle acceptance coverage
- `RATE_LIMIT_SECRET` deployment/environment contract
- Next.js middleware-to-proxy compatibility
- supported Node-version contract

These are investigation starting points, not permanent claims that a defect remains. Always verify against the current branch.

## Working method

Read this file first for substantial work, then inspect relevant current code, schema, migrations, tests, CI, and GitHub state. Explain assumptions and stop when a requested security invariant cannot be proven. Prefer small reversible changes, focused regression tests, and evidence-backed handoff. Do not begin a follow-up priority merely because it is listed above.
