# BeautyBook Documentation

## Authority / Source of Truth

When working on BeautyBook, do not guess and do not rely on stale documentation. If documentation conflicts with the current repository evidence, the repository evidence is correct. Update the documentation to match the source; do not code to match stale prose.

1. **Implementation Truth (Rank 1):** The absolute truth for what BeautyBook *does* is the current source code, `prisma/schema.prisma`, committed migrations, current tests, CI configuration, and current Git state.
2. **Operational Development & Safety (Rank 2):** `AGENTS.md` in the repository root dictates strict safety invariants, autonomous agent permissions (e.g., database mutation targets), and working methods.
3. **Tool Adapters (Rank 2.1):** `CLAUDE.md` and `.cursor/rules/beautybook3.mdc` exist to map tool-specific behaviors to the core policies in `AGENTS.md`. They do not independently redefine architecture.
4. **Current Explanatory Docs (Rank 3):** This `docs/README.md`, the root `README.md`, and `docs/architecture.md` are the current explanations of the system.
5. **Historical Material (Not Authority):** Old plans, audits, and archived instructions do NOT represent the current implementation truth.

## Current Documents

- **[`../README.md`](../README.md):** Project onboarding, environment context, and setup guide.
- **[`architecture.md`](architecture.md):** Current durable architecture of implemented systems.
- **[`supabase-migration-runbook.md`](supabase-migration-runbook.md):** (CURRENT-REFERENCE / PARTIAL) Guide for executing database migrations against hosted Supabase. Note: It may contain historical migration counts that should be disregarded in favor of the current source.

## Roadmap Status

**Important:** The roadmap has not yet been consolidated (pending DOC-2).
The files [`saas-next-steps.md`](saas-next-steps.md) and [`beautybook-improvement-roadmap.md`](beautybook-improvement-roadmap.md) are currently *inputs* to the future roadmap process. They are NOT implementation truth and do not constitute authorized upcoming work.

## Historical / Superseded Material

The following documents are historical archives. **Future developers and AI agents must NOT use these to infer current system behavior or implement missing features based on their contents.**
- `BEAUTYBOOK3-SAAS-UPGRADE-PLAN.md`
- `IMPLEMENTATION-PHASES.md`
- `SAAS-UPGRADE-SUMMARY.md`
- `beautybook-product-audit.md`
- `saas-phase-2-plan.md`
- `saas-phase-5-plan.md`
- `saas-phase-6-plan.md`
- `saas-upgrade-progress.md`
- Documents within `archive/`
- Documents within `superpowers/`
- `../prisma/schema-saas.prisma` (outside `docs/`, a stale non-live schema sketch)

## Operations

For database operations, see the [`supabase-migration-runbook.md`](supabase-migration-runbook.md). Normalization of operations and environment contracts will be formalized in future documentation phases (DOC-4).

## Change Discipline

When modifying the system, ensure that documentation changes accompany code changes. If a test count or migration count is noted as historical context, do not hardcode it as a permanent truth unless necessary. Prefer durable descriptions (e.g., "the suite under `e2e/`") over volatile counts.
