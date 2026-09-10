/**
 * PostgreSQL-backed rate-limit storage for Better Auth.
 *
 * Implements the BetterAuthRateLimitStorage interface using the existing
 * RateLimitBucket table from lib/rate-limit.ts. This makes Better Auth's
 * built-in rate limiting durable and shared across all server instances,
 * replacing the process-local Map used by the old middleware.
 *
 * The consume() method is atomic via PostgreSQL UPSERT, matching the
 * requirement for no concurrent-bypass gap.
 */

import { createHmac } from "node:crypto";
import { checkRateLimit } from "@/lib/rate-limit";

function getRateLimitSecret(): string {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RATE_LIMIT_SECRET is required in production.");
    }
    return "beautybook_local_dev_rate_limit_secret_32chars_min";
  }
  return secret;
}

/**
 * Derives a hashed subject key from the raw rate-limit key supplied by
 * Better Auth (typically "ip:path"). We never store the raw key.
 */
function deriveAuthSubjectHash(key: string): string {
  const secret = getRateLimitSecret();
  return createHmac("sha256", secret).update(`auth:${key}`).digest("hex");
}

export const postgresRateLimitStorage = {
  async consume(
    key: string,
    rule: { window: number; max: number },
  ): Promise<{ allowed: boolean; retryAfter: number | null }> {
    const subjectHash = deriveAuthSubjectHash(key);
    const windowMs = rule.window * 1000;

    const result = await checkRateLimit({
      scope: "auth",
      subjectHash,
      max: rule.max,
      windowMs,
    });

    return {
      allowed: result.allowed,
      retryAfter: result.allowed ? null : Math.ceil((result.resetAt - Date.now()) / 1000),
    };
  },
};
