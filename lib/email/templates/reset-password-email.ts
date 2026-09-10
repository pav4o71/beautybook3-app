import { escapeHtml } from "./escape-html";

export interface ResetPasswordEmailInput {
  userName: string;
  resetUrl: string;
}

export function renderResetPasswordEmail(input: ResetPasswordEmailInput): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = "Reset your BeautyBook password";
  const safeName = escapeHtml(input.userName);
  const safeUrl = escapeHtml(input.resetUrl);

  const text = `Hi ${input.userName},

We received a request to reset your BeautyBook password.

Click the link below to set a new password:
${input.resetUrl}

This link expires in 1 hour. After resetting, all your existing sessions will be signed out.

If you didn't request a password reset, you can safely ignore this email — your password has not been changed.

— BeautyBook`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;color:#18181b;background:#fff;margin:0;padding:0">
<div style="max-width:520px;margin:40px auto;padding:32px 24px;border:1px solid #e4e4e7;border-radius:12px">
  <p style="font-size:18px;font-weight:600;margin:0 0 8px">BeautyBook</p>
  <h1 style="font-size:22px;font-weight:600;margin:0 0 16px;color:#18181b">Reset your password</h1>
  <p style="margin:0 0 8px;color:#3f3f46">Hi ${safeName},</p>
  <p style="margin:0 0 24px;color:#3f3f46;line-height:1.6">
    We received a request to reset your BeautyBook password. Click the button below to choose a new password.
    All existing sessions will be signed out after your password is reset.
  </p>
  <a href="${safeUrl}"
     style="display:inline-block;background:#18181b;color:#fff;padding:10px 22px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500">
    Reset password
  </a>
  <p style="margin:24px 0 0;color:#71717a;font-size:12px;line-height:1.6">
    This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
    Your password has not been changed.
  </p>
</div>
</body>
</html>`;

  return { subject, text, html };
}
