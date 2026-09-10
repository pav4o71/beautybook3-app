/**
 * Email and Application Base URL Configuration.
 *
 * CRITICAL SECURITY INVARIANT:
 * APP_BASE_URL is the ONLY trusted origin used to construct management links.
 * NEVER construct capability links from Host, x-forwarded-host, or incoming headers.
 */

export function getAppBaseUrl(): string {
  const envUrl = process.env.APP_BASE_URL || process.env.BETTER_AUTH_URL || "http://127.0.0.1:3000";
  const trimmed = envUrl.trim().replace(/\/+$/, "");

  try {
    const parsed = new URL(trimmed);
    if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
      throw new Error(`APP_BASE_URL must use HTTPS in production (received ${parsed.protocol}).`);
    }
    return trimmed;
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
    return "http://127.0.0.1:3000";
  }
}

export function getEmailFrom(): string {
  return process.env.EMAIL_FROM || "BeautyBook <noreply@beautybook.ph>";
}
