import type { EmailSender } from "./types";
import { SmtpEmailSender } from "./smtp-sender";
import { ResendEmailSender } from "./resend-sender";
import { MemoryEmailSender } from "./memory-sender";

let customSender: EmailSender | null = null;
const memorySenderInstance = new MemoryEmailSender();

export function setTestEmailSender(sender: EmailSender | null): void {
  customSender = sender;
}

export function getMemoryEmailSender(): MemoryEmailSender {
  return memorySenderInstance;
}

export function getEmailSender(): EmailSender {
  if (customSender) {
    return customSender;
  }

  const rawProvider = process.env.EMAIL_PROVIDER?.toLowerCase()?.trim();
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    if (!rawProvider) {
      throw new Error("EMAIL_PROVIDER environment variable is required in production (e.g. 'resend' or 'smtp').");
    }
    if (rawProvider === "resend") {
      return new ResendEmailSender();
    }
    if (rawProvider === "smtp") {
      return new SmtpEmailSender();
    }
    throw new Error(`Unsupported EMAIL_PROVIDER in production: '${rawProvider}'. Must be 'resend' or 'smtp'.`);
  }

  const provider =
    rawProvider ||
    (process.env.CI || process.env.NODE_ENV === "test" ? "memory" : "smtp");

  if (provider === "memory") {
    return memorySenderInstance;
  }

  if (provider === "resend") {
    return new ResendEmailSender();
  }

  return new SmtpEmailSender();
}
