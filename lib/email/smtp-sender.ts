import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type { EmailSender, SendEmailPayload, SendEmailResult } from "./types";
import { getEmailFrom } from "./config";

export interface SmtpConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

export class SmtpEmailSender implements EmailSender {
  readonly providerName = "smtp";
  private transporter: Transporter;

  constructor(config?: SmtpConfig) {
    const host = config?.host || process.env.SMTP_HOST || "127.0.0.1";
    const port = config?.port || (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 1025);
    const secure = config?.secure ?? false;
    const auth = config?.auth || (process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS || "",
    } : undefined);

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth,
      connectionTimeout: 5000,
      socketTimeout: 5000,
    });
  }

  async send(payload: SendEmailPayload): Promise<SendEmailResult> {
    try {
      const info = await this.transporter.sendMail({
        from: payload.from || getEmailFrom(),
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      });
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "SMTP send failed",
      };
    }
  }
}
