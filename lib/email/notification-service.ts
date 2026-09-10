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

interface DeliveryClaim {
  deliveryId: string;
  claimed: boolean;
  alreadySent: boolean;
}

const CLAIM_LEASE_MS = 30_000;

async function claimOrAcquireDelivery(
  appointmentId: string,
  eventKey: string,
  type: "BOOKING_CONFIRMATION" | "CANCELLATION_CONFIRMATION" | "RESCHEDULE_CONFIRMATION",
  provider: string,
): Promise<DeliveryClaim> {
  const existing = await prisma.notificationDelivery.findUnique({
    where: { eventKey },
  });

  if (existing?.status === "SENT") {
    return { deliveryId: existing.id, claimed: false, alreadySent: true };
  }

  const now = new Date();
  const leaseCutoff = new Date(now.getTime() - CLAIM_LEASE_MS);

  if (!existing) {
    try {
      const created = await prisma.notificationDelivery.create({
        data: {
          appointmentId,
          eventKey,
          type,
          status: "PENDING",
          provider,
          lastAttemptAt: now,
          attemptCount: 1,
        },
      });
      return { deliveryId: created.id, claimed: true, alreadySent: false };
    } catch {
      // Caught unique constraint race, fall through to update claim below
    }
  }

  // Attempt atomic update claim on existing record (retry of FAILED or stale PENDING)
  const updateResult = await prisma.notificationDelivery.updateMany({
    where: {
      eventKey,
      status: { in: ["PENDING", "FAILED"] },
      OR: [
        { status: "FAILED" },
        { lastAttemptAt: null },
        { lastAttemptAt: { lt: leaseCutoff } },
      ],
    },
    data: {
      attemptCount: { increment: 1 },
      lastAttemptAt: now,
      status: "PENDING",
      provider,
    },
  });

  if (updateResult.count > 0) {
    const updated = await prisma.notificationDelivery.findUnique({
      where: { eventKey },
      select: { id: true },
    });
    return { deliveryId: updated!.id, claimed: true, alreadySent: false };
  }

  const current = await prisma.notificationDelivery.findUnique({
    where: { eventKey },
  });

  return {
    deliveryId: current?.id || "",
    claimed: false,
    alreadySent: current?.status === "SENT",
  };
}

async function recordDeliveryResult(
  deliveryId: string,
  result: { success: boolean; messageId?: string; error?: string },
): Promise<void> {
  if (!deliveryId) return;

  if (result.success) {
    await prisma.notificationDelivery.updateMany({
      where: { id: deliveryId, status: "PENDING" },
      data: {
        status: "SENT",
        sentAt: new Date(),
        providerMessageId: result.messageId ?? null,
        lastErrorCode: null,
      },
    });
  } else {
    await prisma.notificationDelivery.updateMany({
      where: { id: deliveryId, status: "PENDING" },
      data: {
        status: "FAILED",
        lastErrorCode: sanitizeErrorCode(result.error),
      },
    });
  }
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

    const claim = await claimOrAcquireDelivery(
      appointment.id,
      eventKey,
      "BOOKING_CONFIRMATION",
      sender.providerName,
    );

    if (claim.alreadySent || !claim.claimed) {
      return { success: true, skipped: true };
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

    await recordDeliveryResult(claim.deliveryId, result);

    if (result.success) {
      return { success: true };
    } else {
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

    const eventKey = `cancellation-confirmation:${appointment.id}:${appointment.cancelledAt?.getTime() ?? appointment.updatedAt.getTime()}`;
    const sender = getEmailSender();

    const claim = await claimOrAcquireDelivery(
      appointment.id,
      eventKey,
      "CANCELLATION_CONFIRMATION",
      sender.providerName,
    );

    if (claim.alreadySent || !claim.claimed) {
      return { success: true, skipped: true };
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

    await recordDeliveryResult(claim.deliveryId, result);

    if (result.success) {
      return { success: true };
    } else {
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

    const eventKey = `admin-cancellation-confirmation:${appointment.id}:${appointment.cancelledAt?.getTime() ?? appointment.updatedAt.getTime()}`;
    const sender = getEmailSender();

    const claim = await claimOrAcquireDelivery(
      appointment.id,
      eventKey,
      "CANCELLATION_CONFIRMATION",
      sender.providerName,
    );

    if (claim.alreadySent || !claim.claimed) {
      return { success: true, skipped: true };
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

    await recordDeliveryResult(claim.deliveryId, result);

    if (result.success) {
      return { success: true };
    } else {
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

    const claim = await claimOrAcquireDelivery(
      appointment.id,
      eventKey,
      "RESCHEDULE_CONFIRMATION",
      sender.providerName,
    );

    if (claim.alreadySent || !claim.claimed) {
      return { success: true, skipped: true };
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

    await recordDeliveryResult(claim.deliveryId, result);

    if (result.success) {
      return { success: true };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Reschedule notification failed",
    };
  }
}
