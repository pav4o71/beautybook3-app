import { after } from "next/server";
import { getEmailSender } from "./sender";
import type { SendEmailPayload } from "./types";

export const AUTH_EMAIL_DELIVERY_ERROR_MESSAGE =
  "Authentication email delivery failed.";

type AuthEmailTask = () => Promise<void>;
type AuthEmailScheduler = (task: AuthEmailTask) => void;

let testScheduler: AuthEmailScheduler | null = null;

export function setTestAuthEmailScheduler(
  scheduler: AuthEmailScheduler | null,
): void {
  testScheduler = scheduler;
}

/**
 * Deliver an auth email after the public response has completed. `after()` keeps
 * the Route Handler alive while this task runs, including in supported
 * serverless runtimes. Never log the payload, recipient, provider response, or
 * bearer URL.
 */
export function scheduleAuthEmail(payload: SendEmailPayload): void {
  const task = async () => {
    try {
      const result = await getEmailSender().send(payload);
      if (result.success) {
        return;
      }
    } catch {
      // Provider exceptions use the same sanitized observation below.
    }

    console.error(AUTH_EMAIL_DELIVERY_ERROR_MESSAGE);
  };

  try {
    (testScheduler ?? after)(task);
  } catch {
    // A scheduling failure must not expose account state or provider details.
    console.error(AUTH_EMAIL_DELIVERY_ERROR_MESSAGE);
  }
}
