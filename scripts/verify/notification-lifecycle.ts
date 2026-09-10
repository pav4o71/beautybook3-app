import "dotenv/config";
import { assertSafeVerifyTarget } from "./assert-safe-target";
import { MemoryEmailSender } from "../../lib/email/memory-sender";
import { setTestEmailSender } from "../../lib/email/sender";
import {
  sendCustomerCancellationNotification,
  sendAdminCancellationNotification,
  sendCustomerRescheduleNotification,
} from "../../lib/email/notification-service";
import {
  createAppointment,
  getAvailableSlots,
} from "../../lib/booking";
import {
  cancelAppointmentByManagementToken,
  rescheduleAppointmentByManagementToken,
} from "../../lib/appointment-management-token";
import { updateAppointmentStatus } from "../../lib/appointments";
import { prisma } from "../../lib/prisma";
import { getDemoTenantContext } from "../../lib/tenant";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function main() {
  assertSafeVerifyTarget();

  const memorySender = new MemoryEmailSender();
  setTestEmailSender(memorySender);

  const tenant = await getDemoTenantContext();
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
      s.getTime() - Date.now() > 36 * 3600 * 1000 &&
      selectedSlots.every(
        (sel) => Math.abs(sel.getTime() - s.getTime()) >= service.durationMin * 60_000,
      )
    ) {
      selectedSlots.push(s);
      if (selectedSlots.length === 5) break;
    }
  }
  assert(selectedSlots.length >= 4, "Expected at least 4 non-overlapping slots beyond cutoff");

  // ==========================================
  // 1. CUSTOMER CANCELLATION NOTIFICATION
  // ==========================================
  const cancelAppt = await createAppointment({
    organizationId: tenant.organizationId,
    locationId: tenant.locationId,
    customerId: null,
    staffId: staff.id,
    serviceIds: [service.id],
    startsAt: selectedSlots[0],
    customerName: "Cancel Guest",
    customerPhone: "+639171113355",
    customerEmail: "cancel.guest@example.com",
  });

  memorySender.clear();

  // Cancel via management token
  const cancelRes = await cancelAppointmentByManagementToken({
    rawToken: cancelAppt.rawToken,
    reason: "schedule_conflict",
  });
  assert(cancelRes.success === true && !cancelRes.alreadyCancelled, "First cancellation succeeds");

  // Dispatch cancellation notification
  const notifRes = await sendCustomerCancellationNotification({
    appointmentId: cancelRes.appointmentId,
    rawToken: cancelAppt.rawToken,
  });
  assert(notifRes.success === true, "sendCustomerCancellationNotification succeeds");
  assert(memorySender.sentEmails.length === 1, "Exactly 1 cancellation email sent");

  const cancelEmail = memorySender.sentEmails[0];
  assert(cancelEmail.to === "cancel.guest@example.com", "Email sent to customerEmail");
  assert(cancelEmail.subject.includes("Cancelled"), "Subject indicates cancellation");
  assert(cancelEmail.text.includes("Schedule conflict"), "Includes cancellation reason label");
  assert(cancelEmail.text.includes(cancelAppt.rawToken), "Contains management link with rawToken");
  assert(cancelEmail.html.includes(`/b/${cancelAppt.rawToken}`), "HTML contains management receipt link");

  // Verify DB record: NO raw token in DB
  const cancelDelivery = await prisma.notificationDelivery.findFirstOrThrow({
    where: {
      appointmentId: cancelAppt.id,
      type: "CANCELLATION_CONFIRMATION",
    },
  });
  assert(cancelDelivery.status === "SENT", "Delivery record is SENT");
  assert(!cancelDelivery.eventKey.includes(cancelAppt.rawToken), "eventKey MUST NOT contain rawToken");
  const cancelRecordSerialized = JSON.stringify(cancelDelivery);
  assert(!cancelRecordSerialized.includes(cancelAppt.rawToken), "DB record MUST NOT contain rawToken");

  // Idempotent duplicate: second call does NOT send another email
  const secondNotifRes = await sendCustomerCancellationNotification({
    appointmentId: cancelRes.appointmentId,
    rawToken: cancelAppt.rawToken,
  });
  assert(secondNotifRes.success === true && secondNotifRes.skipped === true, "Second cancellation email skipped");
  assert(memorySender.sentEmails.length === 1, "No duplicate cancellation email sent");

  // ==========================================
  // 2. ADMIN CANCELLATION NOTIFICATION (LOCKED FOUNDER DECISION: NO /b/[token])
  // ==========================================
  const adminCancelAppt = await createAppointment({
    organizationId: tenant.organizationId,
    locationId: tenant.locationId,
    customerId: null,
    staffId: staff.id,
    serviceIds: [service.id],
    startsAt: selectedSlots[1],
    customerName: "Admin Cancel Guest",
    customerPhone: "+639178884422",
    customerEmail: "admin.cancel@example.com",
  });

  memorySender.clear();

  // Admin marks cancelled
  await updateAppointmentStatus({
    organizationId: tenant.organizationId,
    appointmentId: adminCancelAppt.id,
    status: "CANCELLED",
  });

  // Dispatch admin cancellation notification
  const adminNotifRes = await sendAdminCancellationNotification({
    appointmentId: adminCancelAppt.id,
  });
  assert(adminNotifRes.success === true, "sendAdminCancellationNotification succeeds");
  assert(memorySender.sentEmails.length === 1, "Exactly 1 admin cancellation email sent");

  const adminEmail = memorySender.sentEmails[0];
  assert(adminEmail.to === "admin.cancel@example.com", "Email sent to customerEmail");
  assert(adminEmail.subject.includes("Cancelled"), "Subject indicates cancellation");

  // CRITICAL SECURITY ASSERTION: Admin email MUST NOT contain any /b/[token] management link
  assert(!adminEmail.text.includes("/b/"), "Admin cancellation text MUST NOT contain /b/[token] link");
  assert(!adminEmail.html.includes("/b/"), "Admin cancellation HTML MUST NOT contain /b/[token] link");
  assert(!adminEmail.text.includes(adminCancelAppt.rawToken), "Admin cancellation text MUST NOT contain rawToken");
  assert(!adminEmail.html.includes(adminCancelAppt.rawToken), "Admin cancellation HTML MUST NOT contain rawToken");

  // ==========================================
  // 3. CUSTOMER RESCHEDULE NOTIFICATION
  // ==========================================
  const rescheduleAppt = await createAppointment({
    organizationId: tenant.organizationId,
    locationId: tenant.locationId,
    customerId: null,
    staffId: staff.id,
    serviceIds: [service.id],
    startsAt: selectedSlots[2],
    customerName: "Reschedule Guest",
    customerPhone: "+639173336699",
    customerEmail: "reschedule.guest@example.com",
  });

  memorySender.clear();

  // Reschedule to selectedSlots[3]
  const targetSlot = selectedSlots[3];
  const rescheduleRes = await rescheduleAppointmentByManagementToken({
    rawToken: rescheduleAppt.rawToken,
    targetStartsAt: targetSlot,
  });
  assert(rescheduleRes.success === true, "Reschedule succeeds");

  // Dispatch reschedule notification
  const reschedNotifRes = await sendCustomerRescheduleNotification({
    appointmentId: rescheduleAppt.id,
    rawToken: rescheduleAppt.rawToken,
    previousStartsAt: rescheduleRes.previousStartsAt,
  });
  assert(reschedNotifRes.success === true, "sendCustomerRescheduleNotification succeeds");
  assert(memorySender.sentEmails.length === 1, "Exactly 1 reschedule email sent");

  const reschedEmail = memorySender.sentEmails[0];
  assert(reschedEmail.to === "reschedule.guest@example.com", "Sent to customer email");
  assert(reschedEmail.subject.includes("Rescheduled"), "Subject indicates reschedule");
  assert(reschedEmail.text.includes("Previous Time:"), "Includes previous time");
  assert(reschedEmail.text.includes("NEW TIME:"), "Includes new time");
  assert(reschedEmail.text.includes(rescheduleAppt.rawToken), "Includes management link with rawToken");
  assert(reschedEmail.html.includes(`/b/${rescheduleAppt.rawToken}`), "HTML includes management link");

  // Verify delivery record: NO raw token in DB
  const reschedDelivery = await prisma.notificationDelivery.findFirstOrThrow({
    where: {
      appointmentId: rescheduleAppt.id,
      type: "RESCHEDULE_CONFIRMATION",
    },
  });
  assert(reschedDelivery.status === "SENT", "Reschedule delivery is SENT");
  assert(!reschedDelivery.eventKey.includes(rescheduleAppt.rawToken), "eventKey MUST NOT contain rawToken");
  assert(!JSON.stringify(reschedDelivery).includes(rescheduleAppt.rawToken), "DB record MUST NOT contain rawToken");

  // Second send skipped
  const secondReschedNotif = await sendCustomerRescheduleNotification({
    appointmentId: rescheduleAppt.id,
    rawToken: rescheduleAppt.rawToken,
    previousStartsAt: rescheduleRes.previousStartsAt,
  });
  assert(secondReschedNotif.success === true && secondReschedNotif.skipped === true, "Second reschedule notification skipped");
  assert(memorySender.sentEmails.length === 1, "No duplicate reschedule email sent");

  // ==========================================
  // 4. TRANSPORT ERROR ISOLATION (CANCELLATION)
  // ==========================================
  memorySender.clear();
  memorySender.shouldFail = true;

  const failCancelAppt = await createAppointment({
    organizationId: tenant.organizationId,
    locationId: tenant.locationId,
    customerId: null,
    staffId: staff.id,
    serviceIds: [service.id],
    startsAt: selectedSlots[4] || selectedSlots[2],
    customerName: "Fault Cancel Guest",
    customerPhone: "+639174447711",
    customerEmail: "fault.cancel@example.com",
  });

  // Cancel in DB
  const failCancelRes = await cancelAppointmentByManagementToken({
    rawToken: failCancelAppt.rawToken,
  });
  assert(failCancelRes.success === true, "Cancellation in DB succeeds");

  // Dispatch email with transport failure
  const failNotifRes = await sendCustomerCancellationNotification({
    appointmentId: failCancelAppt.id,
    rawToken: failCancelAppt.rawToken,
  });
  assert(failNotifRes.success === false, "Returns failed result when transport fails");

  // DB appointment is STILL CANCELLED
  const dbCancelled = await prisma.appointment.findUniqueOrThrow({
    where: { id: failCancelAppt.id },
  });
  assert(dbCancelled.status === "CANCELLED", "Appointment remains CANCELLED despite email failure");

  // DB notification is marked FAILED
  const failedDelivery = await prisma.notificationDelivery.findFirstOrThrow({
    where: {
      appointmentId: failCancelAppt.id,
      type: "CANCELLATION_CONFIRMATION",
    },
  });
  assert(failedDelivery.status === "FAILED", "Notification delivery marked FAILED");

  // Cleanup test appointments
  await prisma.appointment.deleteMany({
    where: {
      id: {
        in: [
          cancelAppt.id,
          adminCancelAppt.id,
          rescheduleAppt.id,
          failCancelAppt.id,
        ],
      },
    },
  });

  setTestEmailSender(null);
  console.log("verify:notification-lifecycle passed");
}

main().catch((err) => {
  console.error("verify:notification-lifecycle error:", err);
  process.exit(1);
});
