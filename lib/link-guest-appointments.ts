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
): Promise<{ linked: number }> {
  // Load user from DB
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, emailVerified: true },
  });

  if (!user || !user.emailVerified || !user.email) {
    return { linked: 0 };
  }

  // Normalize email to lowercase for deterministic matching.
  const normalizedEmail = user.email.toLowerCase().trim();

  const result = await prisma.appointment.updateMany({
    where: {
      customerId: null,
      customerEmail: {
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
