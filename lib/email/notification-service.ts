import { prisma } from "@/lib/prisma";
import { formatDay, formatPrice, formatTime } from "@/lib/format";
import { getAppBaseUrl, getEmailFrom } from "./config";
import { getEmailSender } from "./sender";
import { renderBookingConfirmationEmail } from "./templates/booking-confirmation";

function sanitizeErrorCode(err?: string | null): string {
  if (!err) return "UNKNOWN_ERROR";
  // Strip potential tokens, secrets, or URLs from error strings
  return err.slice(0, 200).replace(/https?:\/\/[^\s]+/g, "[URL]");
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

    // Idempotent delivery check / reservation
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
      // Retry for failed or pending
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
    // Top-level catch ensures email dispatch NEVER throws to booking callers
    return {
      success: false,
      error: error instanceof Error ? error.message : "Notification dispatch failed",
    };
  }
}
