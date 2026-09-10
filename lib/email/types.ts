export interface SendEmailPayload {
  to: string;
  from?: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailSender {
  readonly providerName: string;
  send(payload: SendEmailPayload): Promise<SendEmailResult>;
}
