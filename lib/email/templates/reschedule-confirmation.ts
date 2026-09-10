import { escapeHtml } from "./escape-html";

export interface RescheduleEmailInput {
  salonName: string;
  locationName: string;
  locationAddress?: string | null;
  staffName: string;
  customerName: string;
  previousStartsAtFormatted: string;
  newStartsAtFormatted: string;
  services: Array<{ name: string; durationMin: number; priceCents: number }>;
  totalFormatted: string;
  managementUrl: string;
}

export function renderRescheduleEmail(input: RescheduleEmailInput): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = `Appointment Rescheduled: ${input.salonName} - ${input.newStartsAtFormatted}`;

  const safeSalonName = escapeHtml(input.salonName);
  const safeLocationName = escapeHtml(input.locationName);
  const safeLocationAddress = input.locationAddress ? escapeHtml(input.locationAddress) : null;
  const safeStaffName = escapeHtml(input.staffName);
  const safeCustomerName = escapeHtml(input.customerName);
  const safePrevTime = escapeHtml(input.previousStartsAtFormatted);
  const safeNewTime = escapeHtml(input.newStartsAtFormatted);
  const safeTotal = escapeHtml(input.totalFormatted);
  const safeUrl = escapeHtml(input.managementUrl);

  const servicesTextList = input.services
    .map((s) => `- ${s.name} (${s.durationMin} mins)`)
    .join("\n");

  const servicesHtmlList = input.services
    .map((s) => `<li><strong>${escapeHtml(s.name)}</strong> (${s.durationMin} mins)</li>`)
    .join("\n");

  const text = `Hi ${input.customerName},

Your appointment at ${input.salonName} (${input.locationName}) has been rescheduled!

Previous Time: ${input.previousStartsAtFormatted}
NEW TIME: ${input.newStartsAtFormatted}
Specialist: ${input.staffName}
Location: ${input.locationName}${input.locationAddress ? `, ${input.locationAddress}` : ""}
Total: ${input.totalFormatted}

Services:
${servicesTextList}

Manage or reschedule your appointment online anytime:
${input.managementUrl}

Thank you for choosing ${input.salonName}!
`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #18181b; background-color: #f4f4f5; padding: 24px; margin: 0;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e4e4e7; padding: 32px;">
    <h2 style="margin-top: 0; color: #18181b; font-size: 20px; border-bottom: 1px solid #f4f4f5; padding-bottom: 16px;">
      Appointment Rescheduled
    </h2>
    <p style="font-size: 15px; color: #3f3f46;">Hi <strong>${safeCustomerName}</strong>,</p>
    <p style="font-size: 15px; color: #3f3f46;">
      Your appointment at <strong>${safeSalonName}</strong> has been moved to a new time.
    </p>

    <div style="background-color: #ecfdf5; border: 1px solid #d1fae5; border-radius: 6px; padding: 16px; margin: 20px 0;">
      <p style="margin: 4px 0; font-size: 14px; color: #6b7280;"><span style="text-decoration: line-through;">Previous Time: ${safePrevTime}</span></p>
      <p style="margin: 4px 0; font-size: 15px; font-weight: 700; color: #065f46;">NEW TIME: ${safeNewTime}</p>
      <p style="margin: 4px 0; font-size: 14px;"><strong>Specialist:</strong> ${safeStaffName}</p>
      <p style="margin: 4px 0; font-size: 14px;"><strong>Location:</strong> ${safeLocationName}${safeLocationAddress ? ` (${safeLocationAddress})` : ""}</p>
      <p style="margin: 4px 0; font-size: 14px;"><strong>Total:</strong> ${safeTotal}</p>
    </div>

    <div style="margin: 20px 0;">
      <p style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #18181b;">Services:</p>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #3f3f46;">
        ${servicesHtmlList}
      </ul>
    </div>

    <div style="margin: 32px 0 24px; text-align: center;">
      <a href="${safeUrl}" style="background-color: #18181b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px; display: inline-block;">
        View Appointment Details
      </a>
    </div>

    <p style="font-size: 12px; color: #71717a; text-align: center; margin-top: 24px; border-top: 1px solid #f4f4f5; padding-top: 16px;">
      Need to reschedule or cancel? Use the link above anytime up to the salon's cancellation cutoff.
    </p>
  </div>
</body>
</html>`;

  return { subject, text, html };
}
