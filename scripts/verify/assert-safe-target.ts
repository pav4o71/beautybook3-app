/**
 * Verify scripts create/delete appointments, time off, and may toggle staff.active.
 * Require explicit opt-in when DATABASE_URL is not local.
 */
export function assertSafeVerifyTarget() {
  const url = process.env["DATABASE_URL"] ?? "";
  const allowRemote = process.env["VERIFY_ALLOW_REMOTE"] === "1";

  const isLocal =
    url.includes("localhost") ||
    url.includes("127.0.0.1") ||
    url.includes("@db.prisma.io:");

  if (isLocal || allowRemote) {
    return;
  }

  throw new Error(
    "verify scripts mutate the database. Set VERIFY_ALLOW_REMOTE=1 in .env to run against hosted Supabase, or point DATABASE_URL at a local Postgres.",
  );
}
