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
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          timezone: true,
          currency: true,
          phone: true,
        },
      },
      location: {
        select: {
          id: true,
          name: true,
          address: true,
          area: true,
          phone: true,
        },
      },
      staff: {
        select: {
          id: true,
          name: true,
          bio: true,
        },
      },
      services: {
        include: {
          service: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
        orderBy: { service: { name: "asc" } },
      },
    },
  });
}
