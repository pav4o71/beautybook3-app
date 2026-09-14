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

### Prerequisites

- **Node.js**: Node 22 is BeautyBook's canonical tested application runtime baseline.
  - The project root `.nvmrc` contains `22`.
  - Continuous Integration (CI) runs BeautyBook application commands on Node 22.
- **PostgreSQL 16**: Required for the documented local Docker example below.

Copy the environment template:
```bash
cp .env.example .env
```
Ensure required variables are populated. (Note: Production deployments require `RATE_LIMIT_SECRET` to protect auth and booking routes).

### Database Contexts & Safety

BeautyBook strictly isolates database contexts. Do not confuse these concepts:

1. **Canonical local development DB**: The expected target for local active development (`beautybook_dev`).
2. **Hosted application runtime DB**: The database accessed by production or staging application servers.
3. **Hosted migration connection**: A deliberate, controlled connection used by a human to deploy schema changes.
4. **CI ephemeral DB**: Temporary databases spun up during automated GitHub Actions.
5. **Code guard technical allowlist**: The technical fail-closed mechanism in `lib/test-only-local-db.ts` accepts approved loopback hosts and an explicit allowlist of local database names, but does not enforce port 5433 or require one single database name.
6. **Autonomous-agent mutation policy**: The strict rules defined in `AGENTS.md` governing what agents are allowed to mutate.

*Note: `AGENTS.md` remains authoritative for agents. Do not infer that anything accepted by the technical allowlist (`lib/test-only-local-db.ts`) is automatically authorized for autonomous agents.*

#### Documented Local Docker Example

A standard local PostgreSQL instance can be used for testing and development:
```bash
# Example local Postgres container on port 5433
docker run -d --name beautybook3-pg \
  -e POSTGRES_USER=beautybook \
  -e POSTGRES_PASSWORD=beautybook \
  -e POSTGRES_DB=beautybook_dev \
  -p 5433:5432 \
  postgres:16

# Point DATABASE_URL to local instance
export DATABASE_URL="postgresql://beautybook:beautybook@localhost:5433/beautybook_dev?sslmode=disable"
```

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
- **`/s/[orgSlug]/book`**: Public booking flow for anonymous guests, zero-org customers, and organization members.
- **`/b/[token]`**: Guest management capability. Allows unauthenticated customers to manage (cancel/reschedule) their appointment using a raw high-entropy bearer capability; only its SHA-256 hash is stored.

### Customer & Auth Routes
- **`/login`, `/signup`, `/verify-email`, `/forgot-password`, `/reset-password`**: Better Auth managed lifecycle routes.
- **`/account`**: Customer account management and appointment history for verified customers (including those who also have organization memberships).

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
