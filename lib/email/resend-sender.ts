import { Resend } from "resend";
import type { EmailSender, SendEmailPayload, SendEmailResult } from "./types";
import { getEmailFrom } from "./config";

export class ResendEmailSender implements EmailSender {
  readonly providerName = "resend";
  private resend: Resend;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error("RESEND_API_KEY environment variable is missing.");
    }
    this.resend = new Resend(key);
  }

  async send(payload: SendEmailPayload): Promise<SendEmailResult> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: payload.from || getEmailFrom(),
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
        headers: payload.idempotencyKey ? { "Idempotency-Key": payload.idempotencyKey } : undefined,
      });

      if (error) {
        return {
          success: false,
          error: error.message || "Resend API error",
        };
      }

      return {
        success: true,
        messageId: data?.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Resend request failed",
      };
    }
  }
}
