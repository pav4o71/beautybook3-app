# BeautyBook Roadmap

## Authority
This file governs planned product and engineering work for the BeautyBook Multi-Tenant SaaS & Marketplace. However, the current source code, `prisma/schema.prisma`, committed migrations, current tests, and CI configuration remain the absolute implementation truth. If this roadmap conflicts with the repository evidence, the repository evidence is correct.

## Current Baseline
BeautyBook currently provides a secure multi-tenant foundation with robust multi-location support and organization-scoped authorization. The core operational systems are implemented:
- Core booking flow, guest checkout, and management capability (`/b/[token]`).
- Fixed-window rate limiting via PostgreSQL.
- Transactional notification delivery architecture.
- Customer signup, zero-org accounts, and guest linking.
- Admin day board featuring a real temporal timeline and walk-in scheduling.
- Marketplace discoverability with real next-available slots and trust signals.

## Now — Verified Engineering Follow-Ups
The following items are verified open engineering follow-ups backed by current repository evidence. Their presence here does not by itself authorize implementation; each should be handled through a separately scoped task and normal review workflow:
- **Real Better Auth Lifecycle Acceptance (BB-P1-03):** Implement end-to-end HTTP and browser verification token consumption tests.
- **Environment & Rate Limit Contract:** Formalize the `RATE_LIMIT_SECRET` deployment contract and standardize environment documentation.
- **Node Runtime Contract:** Synchronize and formalize the supported Node.js runtime target across development, CI, and production environments.
- **Route Loading & Error Boundaries:** Add `loading.tsx` skeletons and `error.tsx` error boundaries across the public marketplace and admin dashboards.
- **Staff Deactivated Location Edit Retention:** Ensure deactivated branch assignments are preserved when viewing or editing historical staff assignments.
- **Next.js Middleware to Proxy Evaluation:** Evaluate migration from `middleware.ts` to `proxy.ts` against the current Next.js version and BeautyBook security requirements. If the evaluation confirms that migration is appropriate, handle it in a separate scoped implementation task.
- **Stale PR Disposition:** Make a definitive maintenance decision on the unmerged PR #21 and the open draft PR #22.

## Next — Product Candidates
These items are potential product features. They are **not automatically authorized work** and require individual evaluation and scoping before implementation:
- Service comparison and menu matrix.
- Standalone "Book by Professional" flow.
- Progressive multi-step booking wizard.
- One-click rebooking action.
- In-account appointment management UX (adding cancel/reschedule controls directly within `/account`).
- SMS appointment notifications.
- Saved salons, Book the Look, and Beauty Finder Quiz.
- Waitlist / cancellation-backfill workflow.

## Founder Decisions Required
These product and business decisions have significant architectural or policy implications. They require explicit user (founder) approval before any engineering work can begin:
- **Payments, Deposits & Refunds:** Choice of payment gateway (e.g., Stripe, PayMongo) and dispute policies for pay-at-salon vs online prepayments.
- **Customer Reviews & Verified Ratings:** Rules for publication, moderation workflow, and the underlying data schema.
- **Cloud Object Storage Architecture:** Selection of provider (e.g., Cloudflare R2, AWS S3) for salon cover images and staff media.
- **Staff Photo Persistence Model:** Decision between direct object storage uploads versus external image URLs in the admin UI.
- **Premium Salon Mini-Sites:** Scope of branded `/salons/[slug]` themes compared to the standard `/s/[orgSlug]` storefronts.
- **Digital Gift Cards & Loyalty:** Acceptance of financial/ledger liability and the required accounting state machine.
- **Organization Member Invitations:** Choice between self-service invite tokens versus manual administrator assignment.
- **Database RLS vs Application Isolation:** Decision on adopting Supabase RLS policies alongside Prisma tenant scoping.
- **Rate-Limit Tuning:** Specific threshold adjustments based on empirical production traffic patterns.
- **Audit & Notification Data Retention:** Retention windows and soft-delete/prune policies for historical appointments and delivery logs.

## Completed Foundations
The following foundational features are fully implemented and verified in the source:
- Organization and location multi-tenancy rules with default location integrity constraints.
- Role-based authorization gates (`OWNER` or `ADMIN`) and zero-org customer account isolation.
- Management capability token flow (`/b/[token]`) for secure, self-service cancellation and rescheduling.
- Immutable point-in-time appointment contact snapshots and strict server-side E.164 phone normalization.
- Fail-closed local database safety guards for mutating testing scripts.

## Roadmap Change Discipline
- An item is not authorized merely because it appears under "Product Candidates".
- "Founder Decisions" require an explicit user decision and must never be assumed by agents.
- Implemented behavior must always be verified from current source rather than inferred from historical documents.
- As work is completed, it must be verified and moved out of active roadmap sections to maintain accuracy.
