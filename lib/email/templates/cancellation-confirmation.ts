import { escapeHtml } from "./escape-html";

export interface CancellationEmailInput {
  salonName: string;
  locationName: string;
  staffName: string;
  customerName: string;
  startsAtFormatted: string;
  reasonLabel?: string | null;
  /**
   * If customer cancelled, managementUrl is provided (/b/[rawToken]) for receipt viewing.
   * If admin cancelled, managementUrl MUST be null / undefined (locked security invariant).
   */
  managementUrl?: string | null;
}

export function renderCancellationEmail(input: CancellationEmailInput): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = `Appointment Cancelled: ${input.salonName} - ${input.startsAtFormatted}`;

  const safeSalonName = escapeHtml(input.salonName);
  const safeLocationName = escapeHtml(input.locationName);
  const safeStaffName = escapeHtml(input.staffName);
  const safeCustomerName = escapeHtml(input.customerName);
  const safeStartsAt = escapeHtml(input.startsAtFormatted);
  const safeReason = input.reasonLabel ? escapeHtml(input.reasonLabel) : null;
  const safeUrl = input.managementUrl ? escapeHtml(input.managementUrl) : null;

  const textLines = [
    `Hi ${input.customerName},`,
    "",
    `Your appointment at ${input.salonName} (${input.locationName}) has been cancelled.`,
    "",
    `Scheduled Time: ${input.startsAtFormatted}`,
    `Specialist: ${input.staffName}`,
    `Location: ${input.locationName}`,
    ...(input.reasonLabel ? [`Reason: ${input.reasonLabel}`] : []),
    "",
  ];

  if (input.managementUrl) {
    textLines.push(
      "You can view your cancellation receipt or book a new appointment online:",
      input.managementUrl,
      "",
    );
  }

  textLines.push(`Thank you for choosing ${input.salonName}.`);
  const text = textLines.join("\n");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #18181b; background-color: #f4f4f5; padding: 24px; margin: 0;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e4e4e7; padding: 32px;">
    <h2 style="margin-top: 0; color: #e11d48; font-size: 20px; border-bottom: 1px solid #f4f4f5; padding-bottom: 16px;">
      Appointment Cancelled
    </h2>
    <p style="font-size: 15px; color: #3f3f46;">Hi <strong>${safeCustomerName}</strong>,</p>
    <p style="font-size: 15px; color: #3f3f46;">
      Your appointment at <strong>${safeSalonName}</strong> has been cancelled.
    </p>

    <div style="background-color: #fff1f2; border: 1px solid #ffe4e6; border-radius: 6px; padding: 16px; margin: 20px 0;">
      <p style="margin: 4px 0; font-size: 14px;"><strong>Original Time:</strong> ${safeStartsAt}</p>
      <p style="margin: 4px 0; font-size: 14px;"><strong>Specialist:</strong> ${safeStaffName}</p>
      <p style="margin: 4px 0; font-size: 14px;"><strong>Location:</strong> ${safeLocationName}</p>
      ${safeReason ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Reason:</strong> ${safeReason}</p>` : ""}
    </div>

    ${
      safeUrl
        ? `<div style="margin: 32px 0 24px; text-align: center;">
      <a href="${safeUrl}" style="background-color: #18181b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px; display: inline-block;">
        View Cancellation Receipt
      </a>
    </div>`
        : ""
    }

    <p style="font-size: 12px; color: #71717a; text-align: center; margin-top: 24px; border-top: 1px solid #f4f4f5; padding-top: 16px;">
      If you did not request this cancellation or would like to book a new appointment, please contact ${safeSalonName}.
    </p>
  </div>
</body>
</html>`;

  return { subject, text, html };
}
