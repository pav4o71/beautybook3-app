import type { EmailSender, SendEmailPayload, SendEmailResult } from "./types";

export class MemoryEmailSender implements EmailSender {
  readonly providerName = "memory";
  public sentEmails: SendEmailPayload[] = [];
  public shouldFail = false;
  public failErrorMessage = "Simulated transport error";

  async send(payload: SendEmailPayload): Promise<SendEmailResult> {
    if (this.shouldFail) {
      return {
        success: false,
        error: this.failErrorMessage,
      };
    }
    this.sentEmails.push({ ...payload });
    return {
      success: true,
      messageId: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };
  }

  clear(): void {
    this.sentEmails = [];
    this.shouldFail = false;
  }
}
