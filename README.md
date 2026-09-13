# BeautyBook

BeautyBook is a multi-tenant salon/beauty marketplace and appointment-booking SaaS.

Core stack:
- Next.js App Router and Server Actions
- TypeScript, React, and Tailwind CSS
- Prisma ORM with PostgreSQL
- Better Auth
- Playwright E2E tests

## Documentation Authority

Before developing or modifying BeautyBook, read the documentation authority index at **[`docs/README.md`](docs/README.md)**.
This index dictates which files represent current implemented architecture, operational policies (`AGENTS.md`), and historical material.

## Environment & Setup

Copy the environment template:
```bash
cp .env.example .env
```
Ensure required variables are populated. (Note: Production deployments require `RATE_LIMIT_SECRET` to protect auth and booking routes).

### Database Contexts & Safety

BeautyBook strictly isolates database contexts to prevent accidental mutations.

#### 1. Hosted Postgres (Application Runtime)
Point `DATABASE_URL` to a hosted remote PostgreSQL instance (e.g., Supabase) for normal application usage.

#### 2. Human Local Development Example
A standard local PostgreSQL instance can be used for testing and development:
```bash
# Example local Postgres container on port 5433
docker run -d --name beautybook3-pg \
  -e POSTGRES_USER=beautybook \
  -e POSTGRES_PASSWORD=beautybook \
  -e POSTGRES_DB=beautybook \
  -p 5433:5432 \
  postgres:16

# Point DATABASE_URL to local instance
export DATABASE_URL="postgresql://beautybook:beautybook@localhost:5433/beautybook?sslmode=disable"
```
*Note: This is a human/developer local example. Autonomous agents follow strict rules in `AGENTS.md` and may not infer mutation permissions from this example.*

#### 3. Agent & Validation Databases
Mutating scripts (like `npm run prisma:seed`, `npm run verify`, `npm run test:e2e`) use a fail-closed guard (`lib/test-only-local-db.ts`) that strictly refuses non-local targets.
Agents must follow `AGENTS.md` exactly, mutating only the authorized local database (e.g., `beautybook_dev`).

## Development & Testing

Start the local development server:
```bash
npm run dev
```

### Validation Commands
- **`npm run verify`**: Executes integration checks against the authorized local database (scripts defined in `scripts/verify/run-all.ts`).
- **`npm run test:e2e`**: Executes the Playwright E2E suite under `e2e/`.
- **`npm run lint` / `npm run build`**: Safe, non-mutating validation.

## Key Routes & Flow

### Public Flows
- **`/`**: Canonical marketplace discovery.
- **`/search` & `/marketplace`**: Redirect to `/`.
- **`/s/[orgSlug]`**: Salon storefront.
- **`/s/[orgSlug]/book`**: Public booking flow for both members and zero-org customers.
- **`/b/[token]`**: Guest management capability. Allows unauthenticated customers to manage (cancel/reschedule) their appointment using a secure hashed bearer token.

### Customer & Auth Routes
- **`/login`, `/signup`, `/verify-email`, `/forgot-password`, `/reset-password`**: Better Auth managed lifecycle routes.
- **`/account`**: Customer account management and appointment history for users with no salon organization memberships (zero-org customers).

### Tenant Admin Routes
- **`/onboarding`**: Create a new business organization.
- **`/dashboard`**: Organization member home.
- **`/dashboard/admin/*`**: Tenant administration (appointments, services, categories, locations, staff). Strictly gated by `OrgRole` (`OWNER` or `ADMIN`) in `OrganizationMember`. `User.role` does not grant tenant authority.

## Database Migrations

The canonical migration source of truth is located in `prisma/migrations/`. Use `npx prisma migrate deploy` for deployments.

## References
- **Authority Index**: [`docs/README.md`](docs/README.md)
- **Architecture**: [`docs/architecture.md`](docs/architecture.md)
- **Supabase Operations**: [`docs/supabase-migration-runbook.md`](docs/supabase-migration-runbook.md)
