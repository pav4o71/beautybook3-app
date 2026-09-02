import { assertLocalOnlyDatabase } from "../../lib/test-only-local-db";

/**
 * Verify scripts create/delete appointments, time off, and may toggle staff.active.
 * Refuse any database that is not the local Docker Postgres.
 */
export function assertSafeVerifyTarget() {
  assertLocalOnlyDatabase();
}
