import { escapeHtml } from "./escape-html";

export interface VerificationEmailInput {
  userName: string;
  verificationUrl: string;
}

export function renderVerificationEmail(input: VerificationEmailInput): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = "Verify your BeautyBook email address";
  const safeName = escapeHtml(input.userName);
  const safeUrl = escapeHtml(input.verificationUrl);

  const text = `Hi ${input.userName},

Thanks for creating a BeautyBook account.

Please verify your email address by clicking the link below:
${input.verificationUrl}

This link expires in 1 hour.

If you didn't create an account, you can safely ignore this email.

— BeautyBook`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;color:#18181b;background:#fff;margin:0;padding:0">
<div style="max-width:520px;margin:40px auto;padding:32px 24px;border:1px solid #e4e4e7;border-radius:12px">
  <p style="font-size:18px;font-weight:600;margin:0 0 8px">BeautyBook</p>
  <h1 style="font-size:22px;font-weight:600;margin:0 0 16px;color:#18181b">Verify your email address</h1>
  <p style="margin:0 0 8px;color:#3f3f46">Hi ${safeName},</p>
  <p style="margin:0 0 24px;color:#3f3f46;line-height:1.6">
    Thanks for creating a BeautyBook account. Please verify your email address to access your account.
  </p>
  <a href="${safeUrl}"
     style="display:inline-block;background:#18181b;color:#fff;padding:10px 22px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500">
    Verify email address
  </a>
  <p style="margin:24px 0 0;color:#71717a;font-size:12px;line-height:1.6">
    This link expires in 1 hour. If you didn't create a BeautyBook account, you can safely ignore this email.
  </p>
</div>
</body>
</html>`;

  return { subject, text, html };
}
