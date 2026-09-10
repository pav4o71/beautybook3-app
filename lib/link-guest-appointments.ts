/**
 * linkGuestAppointmentsToVerifiedUser
 *
 * Links guest appointments (customerId IS NULL) to a verified user account
 * when the appointment's normalized customerEmail exactly matches the verified
 * user's normalized email.
 *
 * SECURITY INVARIANTS:
 * - Only runs when User.emailVerified == true (verified server-side by caller).
 * - Uses canonical User.email from the database, never from browser input.
 * - Only touches appointments where customerId IS NULL.
 * - Never reassigns an appointment already owned by another user.
 * - Operation is idempotent and race-safe (conditional WHERE prevents double-claim).
 * - Case-insensitive email comparison using lower() to handle historic snapshot data.
 */

import { prisma } from "@/lib/prisma";

export async function linkGuestAppointmentsToVerifiedUser(
  userId: string,
  verifiedEmail: string,
): Promise<{ linked: number }> {
  // Normalize email to lowercase for deterministic matching.
  // Better Auth stores emails lowercase but appointment snapshots may not be.
  const normalizedEmail = verifiedEmail.toLowerCase().trim();

  const result = await prisma.appointment.updateMany({
    where: {
      customerId: null,
      customerEmail: {
        // Prisma does not support lower() directly; use mode: insensitive
        // (PostgreSQL: case-insensitive LIKE using citext or ILIKE)
        equals: normalizedEmail,
        mode: "insensitive",
      },
    },
    data: {
      customerId: userId,
    },
  });

  return { linked: result.count };
}
