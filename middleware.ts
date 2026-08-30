import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_RATE_LIMIT = 10;
const AUTH_WINDOW_MS = 60_000;

type Bucket = { count: number; resetAt: number };

const authBuckets = new Map<string, Bucket>();

function clientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function isRateLimited(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = authBuckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    authBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return true;
  }

  return false;
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/auth")) {
    const skipRateLimit =
      process.env.NODE_ENV !== "production" ||
      process.env.DISABLE_AUTH_RATE_LIMIT === "1";

    if (!skipRateLimit) {
      const ip = clientIp(request);
      if (isRateLimited(`auth:${ip}`, AUTH_RATE_LIMIT, AUTH_WINDOW_MS)) {
        return applySecurityHeaders(
          NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 }),
        );
      }
    }
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
