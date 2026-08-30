# SaaS Upgrade Progress (local Postgres session)

**Target DB:** Local Postgres (`postgresql://beautybook:beautybook@localhost:5433/beautybook`)

## Checklist

| Step | Command | Status |
|------|---------|--------|
| 1 | Start local Postgres (Docker `beautybook3-pg`) | done |
| 2 | `prisma migrate deploy` (5 migrations) | done |
| 3 | `npm run prisma:seed` | done |
| 4 | `npm run verify` | done |
| 5 | `npm run build` | done |
| 6 | `npm run test:e2e` | done (18/18) |

## Fixes applied this session

- `lib/demo-constants.ts` — Prisma-free `DEMO_ORG_SLUG` for Playwright imports
- `e2e/marketplace.spec.ts` — import from `demo-constants` (not `seed` / `tenant`)
- `playwright.config.ts` — pass `DATABASE_URL` / auth env to `webServer`
- `middleware.ts` — skip auth rate limit in non-production (E2E was hitting 10/min cap)

## Local env (use for migrate / verify / e2e)

```bash
export DATABASE_URL="postgresql://beautybook:beautybook@localhost:5433/beautybook?sslmode=disable"
export BETTER_AUTH_SECRET="local-dev-better-auth-secret-min-32-chars"
export BETTER_AUTH_URL="http://localhost:3000"
docker start beautybook3-pg
```

## Notes

- `.env` may still point at Supabase; local commands use `DATABASE_URL` override above.
- Supabase pooler migrations B/C need SQL editor on hosted DB separately (`migrate resolve` after).
