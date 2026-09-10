import { createHmac, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const RATE_LIMIT_CONFIG = {
  PUBLIC_BOOKING: {
    scope: "public_booking",
    max: 5,
    windowMs: 10 * 60 * 1000, // 10 minutes
  },
  CUSTOMER_CANCEL: {
    scope: "customer_cancel",
    max: 5,
    windowMs: 10 * 60 * 1000, // 10 minutes
  },
  CUSTOMER_RESCHEDULE: {
    scope: "customer_reschedule",
    max: 10,
    windowMs: 10 * 60 * 1000, // 10 minutes
  },
} as const;

export const RATE_LIMIT_ERROR_MESSAGE =
  "Too many requests. Please wait a few minutes before trying again.";

function getRateLimitSecret(): string {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RATE_LIMIT_SECRET environment variable is missing in production.");
    }
    return "beautybook_local_dev_rate_limit_secret_32chars_min";
  }
  return secret;
}

/**
 * Computes deterministic HMAC-SHA256 for public booking identity.
 * Combines organization and normalized customer phone.
 * Scoped to organization to prevent cross-branch quota multiplication.
 * Raw phone or IP is NEVER stored in the database.
 */
export function deriveBookingSubjectHash(
  organizationId: string,
  phone: string,
): string {
  const secret = getRateLimitSecret();
  const canonical = `booking:${organizationId}:${phone.trim()}`;
  return createHmac("sha256", secret).update(canonical).digest("hex");
}

/**
 * Computes deterministic HMAC-SHA256 for customer management actions (cancel/reschedule).
 * Derived from the raw token (or its SHA-256 digest).
 * Raw token is NEVER stored in the database.
 */
export function deriveManagementTokenSubjectHash(rawToken: string): string {
  const secret = getRateLimitSecret();
  const canonical = `mgmt:${rawToken.trim()}`;
  return createHmac("sha256", secret).update(canonical).digest("hex");
}

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  max: number;
  resetAt: number;
}

/**
 * Atomically records an attempt in PostgreSQL using fixed-window rate limiting.
 * Avoids read-then-write races using atomic UPSERT.
 */
export async function checkRateLimit(input: {
  scope: string;
  subjectHash: string;
  max: number;
  windowMs: number;
  now?: number;
}): Promise<RateLimitResult> {
  const now = input.now ?? Date.now();
  const windowStartMs = Math.floor(now / input.windowMs) * input.windowMs;
  const windowStart = new Date(windowStartMs);
  const resetAt = windowStartMs + input.windowMs;
  // Retain for window duration + 5-minute safety buffer before expiration
  const expiresAt = new Date(resetAt + 5 * 60 * 1000);
  const newId = `rl_${randomBytes(16).toString("hex")}`;

  // Opportunistic cleanup: 2% probability on calls
  if (Math.random() < 0.02) {
    cleanupExpiredRateLimitBuckets().catch(() => {});
  }

  // Atomic UPSERT with count increment
  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "RateLimitBucket" ("id", "scope", "subjectHash", "windowStart", "count", "expiresAt", "createdAt", "updatedAt")
    VALUES (${newId}, ${input.scope}, ${input.subjectHash}, ${windowStart}, 1, ${expiresAt}, NOW(), NOW())
    ON CONFLICT ("scope", "subjectHash", "windowStart")
    DO UPDATE SET "count" = "RateLimitBucket"."count" + 1, "updatedAt" = NOW()
    RETURNING "count";
  `;

  const count = rows[0]?.count ?? 1;
  const allowed = count <= input.max;

  return {
    allowed,
    count,
    max: input.max,
    resetAt,
  };
}

/**
 * Deletes expired rate-limit buckets from PostgreSQL.
 */
export async function cleanupExpiredRateLimitBuckets(): Promise<number> {
  try {
    const deleted = await prisma.rateLimitBucket.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    return deleted.count;
  } catch {
    return 0;
  }
}
