import { assertLocalOnlyDatabase } from "../../lib/test-only-local-db";

/**
 * Verify scripts mutate the database (appointments, time off, staff toggles).
 * Refuse any database that is not an approved local test/dev database.
 * No remote bypass is permitted.
 */
export function assertSafeVerifyTarget(): void {
  assertLocalOnlyDatabase();
}
