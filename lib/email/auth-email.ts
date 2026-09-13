import { getEmailSender } from "./sender";
import type { SendEmailPayload } from "./types";

export const AUTH_EMAIL_DELIVERY_ERROR_MESSAGE =
  "Authentication email delivery failed.";

/**
 * Auth email is request-critical: a false result and a thrown transport error
 * both become the same sanitized failure. Never include the payload, recipient,
 * provider response, or bearer URL in the error.
 */
export async function sendRequiredAuthEmail(
  payload: SendEmailPayload,
): Promise<void> {
  try {
    const result = await getEmailSender().send(payload);
    if (result.success) {
      return;
    }
  } catch {
    // Replace provider exceptions with the same token-safe failure below.
  }

  throw new Error(AUTH_EMAIL_DELIVERY_ERROR_MESSAGE);
}
