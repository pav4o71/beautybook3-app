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

  const provider =
    process.env.EMAIL_PROVIDER?.toLowerCase() ||
    (process.env.CI || process.env.NODE_ENV === "test" ? "memory" : "smtp");

  if (provider === "memory") {
    return memorySenderInstance;
  }

  if (provider === "resend") {
    return new ResendEmailSender();
  }

  return new SmtpEmailSender();
}
