import "dotenv/config";
import { createAppointment, getAvailableSlots } from "../../lib/booking";
import { prisma } from "../../lib/prisma";
import { getDemoTenantContext } from "../../lib/tenant";
import { addSalonDays, salonDateAtTime, salonDayBounds } from "../../lib/timezone";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function expectRejects(
  fn: () => Promise<unknown>,
  messageIncludes: string,
) {
  try {
    await fn();
    throw new Error(`Expected rejection containing "${messageIncludes}"`);
  } catch (error) {
    if (error instanceof Error && error.message.includes(messageIncludes)) {
      return;
    }
    throw error;
  }
}

async function main() {
  const tenant = await getDemoTenantContext();
  const customer = await prisma.user.findFirstOrThrow({
    where: { email: "customer@beautybook.local" },
  });
  const cut = await prisma.service.findFirstOrThrow({ where: { name: "Haircut" } });
  const maya = await prisma.staff.findFirstOrThrow({ where: { name: "Maya Petrova" } });
  const alex = await prisma.staff.findFirst({
    where: { name: "Alex Rivera", active: false },
  });

  const slots = await getAvailableSlots({
    organizationId: tenant.organizationId,
    staffId: maya.id,
    durationMin: cut.durationMin,
    days: 14,
  });
  assert(slots.length > 0, "Maya should have bookable slots in the next 14 days");

  const sampleSlot = slots[0];

  let inactiveStaffId = alex?.id;
  let restoreMayaActive = false;

  if (!inactiveStaffId) {
    await prisma.staff.update({
      where: { id: maya.id },
      data: { active: false },
    });
    inactiveStaffId = maya.id;
    restoreMayaActive = true;
  } else if (alex) {
    await prisma.staffService.upsert({
      where: {
        staffId_serviceId: { staffId: alex.id, serviceId: cut.id },
      },
      create: { staffId: alex.id, serviceId: cut.id },
      update: {},
    });
  }

  if (!inactiveStaffId) {
    throw new Error("Need inactive staff for availability test");
  }

  try {
    await expectRejects(
      () =>
        createAppointment({
          organizationId: tenant.organizationId,
          locationId: tenant.locationId,
          customerId: customer.id,
          staffId: inactiveStaffId,
          serviceId: cut.id,
          startsAt: sampleSlot,
        }),
      "That staff member is not available.",
    );
  } finally {
    if (restoreMayaActive) {
      await prisma.staff.update({
        where: { id: maya.id },
        data: { active: true },
      });
    }
  }

  const { start: sampleDayStart } = salonDayBounds(sampleSlot);
  let offSchedule = salonDateAtTime(sampleDayStart, 3, 0);
  if (offSchedule.getTime() <= Date.now()) {
    offSchedule = salonDateAtTime(addSalonDays(sampleDayStart, 7), 3, 0);
  }

  await expectRejects(
    () =>
      createAppointment({
        organizationId: tenant.organizationId,
        locationId: tenant.locationId,
        customerId: customer.id,
        staffId: maya.id,
        serviceId: cut.id,
        startsAt: offSchedule,
      }),
    "That time is not available.",
  );

  const bookSlot =
    slots.find((slot) => slot.getTime() > Date.now() + 86_400_000) ??
    slots[slots.length - 1];

  const created = await createAppointment({
    organizationId: tenant.organizationId,
    locationId: tenant.locationId,
    customerId: customer.id,
    staffId: maya.id,
    serviceId: cut.id,
    startsAt: bookSlot,
  });

  await expectRejects(
    () =>
      createAppointment({
        organizationId: tenant.organizationId,
        locationId: tenant.locationId,
        customerId: customer.id,
        staffId: maya.id,
        serviceId: cut.id,
        startsAt: bookSlot,
      }),
    "That time is no longer available.",
  );

  await prisma.appointment.delete({ where: { id: created.id } });

  const admin = await prisma.user.findFirstOrThrow({
    where: { email: "demo@beautybook.local" },
  });

  const freshSlots = await getAvailableSlots({
    organizationId: tenant.organizationId,
    staffId: maya.id,
    durationMin: cut.durationMin,
    days: 14,
  });
  assert(freshSlots.length > 0, "Need open slots for parallel race test");

  const parallelSlot =
    freshSlots.find((slot) => slot.getTime() > Date.now() + 86_400_000) ??
    freshSlots[freshSlots.length - 1];

  const parallelResults = await Promise.allSettled([
    createAppointment({
      organizationId: tenant.organizationId,
      locationId: tenant.locationId,
      customerId: customer.id,
      staffId: maya.id,
      serviceId: cut.id,
      startsAt: parallelSlot,
    }),
    createAppointment({
      organizationId: tenant.organizationId,
      locationId: tenant.locationId,
      customerId: admin.id,
      staffId: maya.id,
      serviceId: cut.id,
      startsAt: parallelSlot,
    }),
  ]);

  const parallelSuccesses = parallelResults.filter((result) => result.status === "fulfilled");
  const parallelFailures = parallelResults.filter((result) => result.status === "rejected");

  assert(parallelSuccesses.length === 1, "Exactly one parallel book should succeed");
  assert(parallelFailures.length === 1, "Exactly one parallel book should fail");

  const rejected = parallelFailures[0];
  assert(
    rejected.status === "rejected" &&
      rejected.reason instanceof Error &&
      rejected.reason.message.includes("That time is no longer available."),
    "Parallel loser should get clash message",
  );

  const parallelWinner = parallelSuccesses[0];
  assert(parallelWinner.status === "fulfilled", "Parallel winner should be fulfilled");
  await prisma.appointment.delete({ where: { id: parallelWinner.value.id } });

  await prisma.$disconnect();

  console.log("verify-booking: ok", {
    inactiveStaffFallback: restoreMayaActive,
    offSchedule: offSchedule.toISOString(),
    doubleBookSlot: bookSlot.toISOString(),
    parallelSlot: parallelSlot.toISOString(),
    parallelRace: "one-success-one-reject",
  });
}

main().catch((error) => {
  console.error("verify-booking: failed", error);
  process.exitCode = 1;
});
