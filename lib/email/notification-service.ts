import { prisma } from "@/lib/prisma";
import { formatDay, formatPrice, formatTime } from "@/lib/format";
import { CANCELLATION_REASONS } from "@/lib/cancellation-constants";
import { getAppBaseUrl, getEmailFrom } from "./config";
import { getEmailSender } from "./sender";
import { renderBookingConfirmationEmail } from "./templates/booking-confirmation";
import { renderCancellationEmail } from "./templates/cancellation-confirmation";
import { renderRescheduleEmail } from "./templates/reschedule-confirmation";

function sanitizeErrorCode(err?: string | null): string {
  if (!err) return "UNKNOWN_ERROR";
  return err.slice(0, 200).replace(/https?:\/\/[^\s]+/g, "[URL]");
}

function getCancellationReasonLabel(reason?: string | null): string | null {
  if (!reason) return null;
  const match = CANCELLATION_REASONS.find((r) => r.value === reason);
  return match?.label ?? reason;
}

export async function sendBookingConfirmationNotification(input: {
  appointmentId: string;
  rawToken: string;
}): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: input.appointmentId },
      include: {
        organization: { select: { name: true } },
        location: { select: { name: true, address: true } },
        staff: { select: { name: true } },
        services: {
          include: { service: { select: { name: true } } },
          orderBy: { service: { name: "asc" } },
        },
      },
    });

    if (!appointment) {
      return { success: false, error: "Appointment not found" };
    }

    if (!appointment.customerEmail || !appointment.customerEmail.trim()) {
      return { success: true, skipped: true };
    }

    const eventKey = `booking-confirmation:${appointment.id}:${appointment.createdAt.getTime()}`;
    const sender = getEmailSender();

    const existing = await prisma.notificationDelivery.findUnique({
      where: { eventKey },
    });

    if (existing?.status === "SENT") {
      return { success: true, skipped: true };
    }

    let deliveryId: string;

    if (!existing) {
      const created = await prisma.notificationDelivery.create({
        data: {
          appointmentId: appointment.id,
          eventKey,
          type: "BOOKING_CONFIRMATION",
          status: "PENDING",
          provider: sender.providerName,
          lastAttemptAt: new Date(),
        },
      });
      deliveryId = created.id;
    } else {
      const updated = await prisma.notificationDelivery.update({
        where: { id: existing.id },
        data: {
          attemptCount: { increment: 1 },
          lastAttemptAt: new Date(),
          status: "PENDING",
          provider: sender.providerName,
        },
      });
      deliveryId = updated.id;
    }

    const totalCents = appointment.services.reduce((sum, s) => sum + s.priceCents, 0);
    const startsAtFormatted = `${formatDay(appointment.startsAt)} at ${formatTime(appointment.startsAt)}`;
    const managementUrl = `${getAppBaseUrl()}/b/${input.rawToken}`;

    const { subject, text, html } = renderBookingConfirmationEmail({
      salonName: appointment.organization.name,
      locationName: appointment.location.name,
      locationAddress: appointment.location.address,
      staffName: appointment.staff.name,
      customerName: appointment.customerName || "Valued Customer",
      startsAtFormatted,
      services: appointment.services.map((s) => ({
        name: s.service.name,
        durationMin: s.durationMin,
        priceCents: s.priceCents,
      })),
      totalFormatted: formatPrice(totalCents),
      managementUrl,
    });

    const result = await sender.send({
      to: appointment.customerEmail,
      from: getEmailFrom(),
      subject,
      text,
      html,
      idempotencyKey: eventKey,
    });

    if (result.success) {
      await prisma.notificationDelivery.update({
        where: { id: deliveryId },
        data: {
          status: "SENT",
          sentAt: new Date(),
          providerMessageId: result.messageId ?? null,
          lastErrorCode: null,
        },
      });
      return { success: true };
    } else {
      await prisma.notificationDelivery.update({
        where: { id: deliveryId },
        data: {
          status: "FAILED",
          lastErrorCode: sanitizeErrorCode(result.error),
        },
      });
      return { success: false, error: result.error };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Notification dispatch failed",
    };
  }
}

export async function sendCustomerCancellationNotification(input: {
  appointmentId: string;
  rawToken: string;
}): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: input.appointmentId },
      include: {
        organization: { select: { name: true } },
        location: { select: { name: true } },
        staff: { select: { name: true } },
      },
    });

    if (!appointment) {
      return { success: false, error: "Appointment not found" };
    }

    if (!appointment.customerEmail || !appointment.customerEmail.trim()) {
      return { success: true, skipped: true };
    }

    const eventKey = `cancellation-confirmation:${appointment.id}:${appointment.cancelledAt?.getTime() ?? Date.now()}`;
    const sender = getEmailSender();

    const existing = await prisma.notificationDelivery.findUnique({
      where: { eventKey },
    });

    if (existing?.status === "SENT") {
      return { success: true, skipped: true };
    }

    let deliveryId: string;

    if (!existing) {
      const created = await prisma.notificationDelivery.create({
        data: {
          appointmentId: appointment.id,
          eventKey,
          type: "CANCELLATION_CONFIRMATION",
          status: "PENDING",
          provider: sender.providerName,
          lastAttemptAt: new Date(),
        },
      });
      deliveryId = created.id;
    } else {
      const updated = await prisma.notificationDelivery.update({
        where: { id: existing.id },
        data: {
          attemptCount: { increment: 1 },
          lastAttemptAt: new Date(),
          status: "PENDING",
          provider: sender.providerName,
        },
      });
      deliveryId = updated.id;
    }

    const startsAtFormatted = `${formatDay(appointment.startsAt)} at ${formatTime(appointment.startsAt)}`;
    const managementUrl = `${getAppBaseUrl()}/b/${input.rawToken}`;
    const reasonLabel = getCancellationReasonLabel(appointment.cancelReason);

    const { subject, text, html } = renderCancellationEmail({
      salonName: appointment.organization.name,
      locationName: appointment.location.name,
      staffName: appointment.staff.name,
      customerName: appointment.customerName || "Valued Customer",
      startsAtFormatted,
      reasonLabel,
      managementUrl,
    });

    const result = await sender.send({
      to: appointment.customerEmail,
      from: getEmailFrom(),
      subject,
      text,
      html,
      idempotencyKey: eventKey,
    });

    if (result.success) {
      await prisma.notificationDelivery.update({
        where: { id: deliveryId },
        data: {
          status: "SENT",
          sentAt: new Date(),
          providerMessageId: result.messageId ?? null,
          lastErrorCode: null,
        },
      });
      return { success: true };
    } else {
      await prisma.notificationDelivery.update({
        where: { id: deliveryId },
        data: {
          status: "FAILED",
          lastErrorCode: sanitizeErrorCode(result.error),
        },
      });
      return { success: false, error: result.error };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Cancellation notification failed",
    };
  }
}

export async function sendAdminCancellationNotification(input: {
  appointmentId: string;
}): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: input.appointmentId },
      include: {
        organization: { select: { name: true } },
        location: { select: { name: true } },
        staff: { select: { name: true } },
      },
    });

    if (!appointment) {
      return { success: false, error: "Appointment not found" };
    }

    if (!appointment.customerEmail || !appointment.customerEmail.trim()) {
      return { success: true, skipped: true };
    }

    const eventKey = `admin-cancellation-confirmation:${appointment.id}:${appointment.cancelledAt?.getTime() ?? Date.now()}`;
    const sender = getEmailSender();

    const existing = await prisma.notificationDelivery.findUnique({
      where: { eventKey },
    });

    if (existing?.status === "SENT") {
      return { success: true, skipped: true };
    }

    let deliveryId: string;

    if (!existing) {
      const created = await prisma.notificationDelivery.create({
        data: {
          appointmentId: appointment.id,
          eventKey,
          type: "CANCELLATION_CONFIRMATION",
          status: "PENDING",
          provider: sender.providerName,
          lastAttemptAt: new Date(),
        },
      });
      deliveryId = created.id;
    } else {
      const updated = await prisma.notificationDelivery.update({
        where: { id: existing.id },
        data: {
          attemptCount: { increment: 1 },
          lastAttemptAt: new Date(),
          status: "PENDING",
          provider: sender.providerName,
        },
      });
      deliveryId = updated.id;
    }

    const startsAtFormatted = `${formatDay(appointment.startsAt)} at ${formatTime(appointment.startsAt)}`;

    // LOCKED FOUNDER DECISION:
    // Admin cancellation MUST NOT include /b/[token] because the raw token is never stored.
    const { subject, text, html } = renderCancellationEmail({
      salonName: appointment.organization.name,
      locationName: appointment.location.name,
      staffName: appointment.staff.name,
      customerName: appointment.customerName || "Valued Customer",
      startsAtFormatted,
      reasonLabel: "Cancelled by salon administration",
      managementUrl: null, // STRICTLY ABSENT
    });

    const result = await sender.send({
      to: appointment.customerEmail,
      from: getEmailFrom(),
      subject,
      text,
      html,
      idempotencyKey: eventKey,
    });

    if (result.success) {
      await prisma.notificationDelivery.update({
        where: { id: deliveryId },
        data: {
          status: "SENT",
          sentAt: new Date(),
          providerMessageId: result.messageId ?? null,
          lastErrorCode: null,
        },
      });
      return { success: true };
    } else {
      await prisma.notificationDelivery.update({
        where: { id: deliveryId },
        data: {
          status: "FAILED",
          lastErrorCode: sanitizeErrorCode(result.error),
        },
      });
      return { success: false, error: result.error };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Admin cancellation notification failed",
    };
  }
}

export async function sendCustomerRescheduleNotification(input: {
  appointmentId: string;
  rawToken: string;
  previousStartsAt: Date;
}): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: input.appointmentId },
      include: {
        organization: { select: { name: true } },
        location: { select: { name: true, address: true } },
        staff: { select: { name: true } },
        services: {
          include: { service: { select: { name: true } } },
          orderBy: { service: { name: "asc" } },
        },
      },
    });

    if (!appointment) {
      return { success: false, error: "Appointment not found" };
    }

    if (!appointment.customerEmail || !appointment.customerEmail.trim()) {
      return { success: true, skipped: true };
    }

    const eventKey = `reschedule-confirmation:${appointment.id}:${appointment.updatedAt.getTime()}`;
    const sender = getEmailSender();

    const existing = await prisma.notificationDelivery.findUnique({
      where: { eventKey },
    });

    if (existing?.status === "SENT") {
      return { success: true, skipped: true };
    }

    let deliveryId: string;

    if (!existing) {
      const created = await prisma.notificationDelivery.create({
        data: {
          appointmentId: appointment.id,
          eventKey,
          type: "RESCHEDULE_CONFIRMATION",
          status: "PENDING",
          provider: sender.providerName,
          lastAttemptAt: new Date(),
        },
      });
      deliveryId = created.id;
    } else {
      const updated = await prisma.notificationDelivery.update({
        where: { id: existing.id },
        data: {
          attemptCount: { increment: 1 },
          lastAttemptAt: new Date(),
          status: "PENDING",
          provider: sender.providerName,
        },
      });
      deliveryId = updated.id;
    }

    const totalCents = appointment.services.reduce((sum, s) => sum + s.priceCents, 0);
    const previousStartsAtFormatted = `${formatDay(input.previousStartsAt)} at ${formatTime(input.previousStartsAt)}`;
    const newStartsAtFormatted = `${formatDay(appointment.startsAt)} at ${formatTime(appointment.startsAt)}`;
    const managementUrl = `${getAppBaseUrl()}/b/${input.rawToken}`;

    const { subject, text, html } = renderRescheduleEmail({
      salonName: appointment.organization.name,
      locationName: appointment.location.name,
      locationAddress: appointment.location.address,
      staffName: appointment.staff.name,
      customerName: appointment.customerName || "Valued Customer",
      previousStartsAtFormatted,
      newStartsAtFormatted,
      services: appointment.services.map((s) => ({
        name: s.service.name,
        durationMin: s.durationMin,
        priceCents: s.priceCents,
      })),
      totalFormatted: formatPrice(totalCents),
      managementUrl,
    });

    const result = await sender.send({
      to: appointment.customerEmail,
      from: getEmailFrom(),
      subject,
      text,
      html,
      idempotencyKey: eventKey,
    });

    if (result.success) {
      await prisma.notificationDelivery.update({
        where: { id: deliveryId },
        data: {
          status: "SENT",
          sentAt: new Date(),
          providerMessageId: result.messageId ?? null,
          lastErrorCode: null,
        },
      });
      return { success: true };
    } else {
      await prisma.notificationDelivery.update({
        where: { id: deliveryId },
        data: {
          status: "FAILED",
          lastErrorCode: sanitizeErrorCode(result.error),
        },
      });
      return { success: false, error: result.error };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Reschedule notification failed",
    };
  }
}
