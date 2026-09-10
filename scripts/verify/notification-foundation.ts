import "dotenv/config";
import { assertSafeVerifyTarget } from "./assert-safe-target";
import { escapeHtml } from "../../lib/email/templates/escape-html";
import { getAppBaseUrl } from "../../lib/email/config";
import { MemoryEmailSender } from "../../lib/email/memory-sender";
import { setTestEmailSender } from "../../lib/email/sender";
import { sendBookingConfirmationNotification } from "../../lib/email/notification-service";
import { createAppointment, getAvailableSlots } from "../../lib/booking";
import { prisma } from "../../lib/prisma";
import { getDemoTenantContext } from "../../lib/tenant";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function main() {
  assertSafeVerifyTarget();

  // 1. HTML Escaping Unit Tests
  const unsafe = `<script>alert("xss & 'attack'")</script>`;
  const escaped = escapeHtml(unsafe);
  assert(!escaped.includes("<script>"), "HTML tags must be escaped");
  assert(escaped.includes("&lt;script&gt;"), "Tags replaced with entities");
  assert(escaped.includes("&quot;"), "Quotes escaped");
  assert(escaped.includes("&#39;"), "Apostrophes escaped");
  assert(escaped.includes("&amp;"), "Ampersands escaped");

  // 2. Base URL Validation Tests
  const currentBase = getAppBaseUrl();
  assert(currentBase.startsWith("http"), "getAppBaseUrl returns valid HTTP/HTTPS URL");
  assert(!currentBase.endsWith("/"), "getAppBaseUrl strips trailing slash");

  // 3. Provider Abstraction / Memory Sender
  const memorySender = new MemoryEmailSender();
  setTestEmailSender(memorySender);

  const testPayload = {
    to: "guest@example.com",
    subject: "Test",
    text: "Test body",
    html: "<p>Test body</p>",
  };

  const sendRes = await memorySender.send(testPayload);
  assert(sendRes.success === true, "Memory sender send succeeds");
  assert(typeof sendRes.messageId === "string" && sendRes.messageId.startsWith("mem_"), "Memory sender returns messageId");
  assert(memorySender.sentEmails.length === 1, "Memory sender stores sent payload");
  assert(memorySender.sentEmails[0].to === "guest@example.com", "Sent payload recipient matches");

  memorySender.clear();
  assert(memorySender.sentEmails.length === 0, "Clear resets memory sender");

  // 4. Booking Notification Integration
  const tenant = await getDemoTenantContext();
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: tenant.organizationId },
  });
  const staff = await prisma.staff.findFirstOrThrow({
    where: { organizationId: tenant.organizationId, active: true },
  });
  const service = await prisma.service.findFirstOrThrow({
    where: { organizationId: tenant.organizationId, active: true },
  });

  const rawSlots = await getAvailableSlots({
    organizationId: tenant.organizationId,
    staffId: staff.id,
    durationMin: service.durationMin,
    days: 14,
  });
  const selectedSlots: Date[] = [];
  for (const s of rawSlots) {
    if (
      selectedSlots.every(
        (sel) => Math.abs(sel.getTime() - s.getTime()) >= service.durationMin * 60_000,
      )
    ) {
      selectedSlots.push(s);
      if (selectedSlots.length === 3) break;
    }
  }
  assert(selectedSlots.length === 3, "Expected at least 3 non-overlapping slots for testing");
  const startsAt = selectedSlots[0];
  const startsAt2 = selectedSlots[1];
  const startsAt3 = selectedSlots[2];

  // 4a. Booking with NO customerEmail -> should skip email safely
  const noEmailBooking = await createAppointment({
    organizationId: tenant.organizationId,
    locationId: tenant.locationId,
    customerId: null,
    staffId: staff.id,
    serviceIds: [service.id],
    startsAt,
    customerName: "No Email Guest",
    customerPhone: "+639171112233",
    customerEmail: null,
  });

  const skipResult = await sendBookingConfirmationNotification({
    appointmentId: noEmailBooking.id,
    rawToken: noEmailBooking.rawToken,
  });
  assert(skipResult.success === true && skipResult.skipped === true, "Skips email when customerEmail is null");
  assert(memorySender.sentEmails.length === 0, "No email sent when customerEmail is null");

  const noEmailDelivery = await prisma.notificationDelivery.findFirst({
    where: { appointmentId: noEmailBooking.id },
  });
  assert(noEmailDelivery === null, "No NotificationDelivery row created when skipped");

  // 4b. Booking WITH customerEmail -> should send email post-commit
  const emailBooking = await createAppointment({
    organizationId: tenant.organizationId,
    locationId: tenant.locationId,
    customerId: null,
    staffId: staff.id,
    serviceIds: [service.id],
    startsAt: startsAt2,
    customerName: "Maria Santos",
    customerPhone: "+639179998877",
    customerEmail: "maria.santos@example.com",
  });

  const sendResult = await sendBookingConfirmationNotification({
    appointmentId: emailBooking.id,
    rawToken: emailBooking.rawToken,
  });
  assert(sendResult.success === true, "sendBookingConfirmationNotification succeeds");
  assert(memorySender.sentEmails.length === 1, "Exactly one email sent");

  const sentEmail = memorySender.sentEmails[0];
  assert(sentEmail.to === "maria.santos@example.com", "Recipient is normalized customerEmail");
  assert(sentEmail.subject.includes(org.name), "Subject includes salon name");
  assert(sentEmail.text.includes(emailBooking.rawToken), "Email body contains rawToken in management link");
  assert(sentEmail.html.includes(`/b/${emailBooking.rawToken}`), "HTML body contains management link");

  // 4c. Audit Table Security: NO RAW TOKEN OR BEARER URL IN DATABASE
  const deliveryRecord = await prisma.notificationDelivery.findFirstOrThrow({
    where: { appointmentId: emailBooking.id },
  });
  assert(deliveryRecord.status === "SENT", "Delivery status is SENT");
  assert(deliveryRecord.type === "BOOKING_CONFIRMATION", "Delivery type is BOOKING_CONFIRMATION");
  assert(deliveryRecord.provider === "memory", "Delivery provider matches sender");
  assert(deliveryRecord.sentAt !== null, "sentAt is recorded");
  assert(!deliveryRecord.eventKey.includes(emailBooking.rawToken), "eventKey MUST NOT contain rawToken");

  // Verify all fields on the record do not contain the raw token
  const recordValues = Object.values(deliveryRecord).map(String).join(" ");
  assert(!recordValues.includes(emailBooking.rawToken), "NotificationDelivery table MUST NOT persist rawToken anywhere");

  // 4d. Idempotency Deduplication
  const secondSendResult = await sendBookingConfirmationNotification({
    appointmentId: emailBooking.id,
    rawToken: emailBooking.rawToken,
  });
  assert(secondSendResult.success === true && secondSendResult.skipped === true, "Second send is skipped idempotently");
  assert(memorySender.sentEmails.length === 1, "No duplicate email dispatched on repeat call");

  // 4e. Failed Delivery Isolation (transport error does not rollback/throw)
  memorySender.clear();
  memorySender.shouldFail = true;

  const failingBooking = await createAppointment({
    organizationId: tenant.organizationId,
    locationId: tenant.locationId,
    customerId: null,
    staffId: staff.id,
    serviceIds: [service.id],
    startsAt: startsAt3,
    customerName: "Fault Test Guest",
    customerPhone: "+639175554433",
    customerEmail: "fault.test@example.com",
  });

  const failedResult = await sendBookingConfirmationNotification({
    appointmentId: failingBooking.id,
    rawToken: failingBooking.rawToken,
  });

   assert(failedResult.success === false, "Returns failed result when transport fails");
   assert(Boolean(failedResult.error?.includes("Simulated transport error")), "Reports sanitized error");

   // Verify appointment STILL exists and is CONFIRMED in database
   const confirmedDbAppt = await prisma.appointment.findUnique({
     where: { id: failingBooking.id },
   });
   assert(confirmedDbAppt !== null, "Appointment still exists in database after email failure");
   assert(confirmedDbAppt?.status === "CONFIRMED", "Appointment remains CONFIRMED despite email failure");

  // Verify delivery record recorded FAILED status
  const failedDelivery = await prisma.notificationDelivery.findFirstOrThrow({
    where: { appointmentId: failingBooking.id },
  });
  assert(failedDelivery.status === "FAILED", "NotificationDelivery status is FAILED");
  assert(failedDelivery.lastErrorCode !== null, "lastErrorCode is recorded");

  // Cleanup test appointments
  await prisma.appointment.deleteMany({
    where: {
      id: { in: [noEmailBooking.id, emailBooking.id, failingBooking.id] },
    },
  });

  // Reset test sender
  setTestEmailSender(null);

  console.log("verify:notification-foundation passed");
}

main().catch((err) => {
  console.error("verify:notification-foundation error:", err);
  process.exit(1);
});
