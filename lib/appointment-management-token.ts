import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * Expected token format: 32 cryptographically random bytes (256 bits of entropy)
 * encoded as standard unpadded base64url (43 characters: [A-Za-z0-9_-]).
 */
const TOKEN_REGEX = /^[A-Za-z0-9_-]{43}$/;

/**
 * Validates whether an incoming token matches the bounded token format.
 */
export function isValidManagementTokenFormat(token: unknown): token is string {
  return typeof token === "string" && TOKEN_REGEX.test(token);
}

/**
 * Computes deterministic SHA-256 hex digest of a raw management capability token.
 * Only this hash is stored in or queried against the database.
 */
export function hashManagementToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Generates an opaque random 256-bit management capability token and its SHA-256 hash.
 * The raw token is given to the customer in the management URL.
 * The hash is stored in the database `Appointment.managementTokenHash`.
 */
export function generateAppointmentManagementToken(): {
  rawToken: string;
  tokenHash: string;
} {
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashManagementToken(rawToken);
  return { rawToken, tokenHash };
}

/**
 * Resolves an appointment by its raw management token using deterministic SHA-256 hash lookup.
 * Returns null if token is malformed, invalid, or does not match any appointment.
 */
export async function getAppointmentByManagementToken(rawToken: unknown) {
  if (!isValidManagementTokenFormat(rawToken)) {
    return null;
  }

  const tokenHash = hashManagementToken(rawToken);

  return prisma.appointment.findUnique({
    where: {
      managementTokenHash: tokenHash,
    },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      status: true,
      customerName: true,
      cancelledAt: true,
      cancelReason: true,
      cancelNote: true,
      organization: {
        select: {
          name: true,
          slug: true,
        },
      },
      location: {
        select: {
          name: true,
          address: true,
          area: true,
        },
      },
      staff: {
        select: {
          name: true,
        },
      },
      services: {
        select: {
          serviceId: true,
          durationMin: true,
          priceCents: true,
          service: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { service: { name: "asc" } },
      },
    },
  });
}

export {
  CANCELLATION_REASONS,
  type CancellationReasonValue,
  ALLOWED_CANCELLATION_REASONS,
  CANCELLATION_CUTOFF_HOURS,
} from "@/lib/cancellation-constants";
import {
  ALLOWED_CANCELLATION_REASONS,
  CANCELLATION_CUTOFF_HOURS,
} from "@/lib/cancellation-constants";

export function canCustomerCancelAppointment(
  appointment: {
    startsAt: Date;
    status: string;
  },
  now: Date = new Date(),
): { allowed: boolean; reason?: string } {
  if (appointment.status === "CANCELLED") {
    return { allowed: false, reason: "Appointment is already cancelled." };
  }
  if (appointment.status !== "CONFIRMED" && appointment.status !== "PENDING") {
    return { allowed: false, reason: "This appointment can no longer be cancelled." };
  }
  if (now >= appointment.startsAt) {
    return { allowed: false, reason: "Past appointments cannot be cancelled." };
  }
  const hoursUntilStart =
    (appointment.startsAt.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntilStart < CANCELLATION_CUTOFF_HOURS) {
    return {
      allowed: false,
      reason: `Appointments cannot be cancelled within ${CANCELLATION_CUTOFF_HOURS} hours of the scheduled time.`,
    };
  }
  return { allowed: true };
}

export async function cancelAppointmentByManagementToken(input: {
  rawToken: unknown;
  reason?: string | null;
  note?: string | null;
}): Promise<{ success: boolean; alreadyCancelled: boolean }> {
  if (!isValidManagementTokenFormat(input.rawToken)) {
    throw new Error("Invalid management token.");
  }

  const tokenHash = hashManagementToken(input.rawToken);
  const now = new Date();

  // Validate optional reason
  let validatedReason: string | null = null;
  if (input.reason && input.reason.trim().length > 0) {
    const trimmed = input.reason.trim();
    if (!ALLOWED_CANCELLATION_REASONS.has(trimmed)) {
      throw new Error("Invalid cancellation reason.");
    }
    validatedReason = trimmed;
  }

  // Validate optional note
  let validatedNote: string | null = null;
  if (input.note && input.note.trim().length > 0) {
    const trimmed = input.note.trim();
    if (trimmed.length > 300) {
      throw new Error("Cancellation note must not exceed 300 characters.");
    }
    validatedNote = trimmed;
  }

  return prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findUnique({
      where: { managementTokenHash: tokenHash },
      select: {
        id: true,
        startsAt: true,
        status: true,
      },
    });

    if (!appointment) {
      throw new Error("Appointment not found.");
    }

    if (appointment.status === "CANCELLED") {
      return { success: true, alreadyCancelled: true };
    }

    const check = canCustomerCancelAppointment(appointment, now);
    if (!check.allowed) {
      throw new Error(check.reason || "Appointment cannot be cancelled.");
    }

    await tx.appointment.update({
      where: { id: appointment.id },
      data: {
        status: "CANCELLED",
        cancelledAt: now,
        cancelReason: validatedReason,
        cancelNote: validatedNote,
      },
    });

    return { success: true, alreadyCancelled: false };
  });
}
