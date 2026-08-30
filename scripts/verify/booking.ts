import "dotenv/config";
import { createAppointment, getAvailableSlots } from "../../lib/booking";
import {
  MAX_BOOKING_SERVICES,
  MAX_COMBINED_DURATION_MIN,
  firstLocationWithCapableStaff,
} from "../../lib/booking-limits";
import { prisma } from "../../lib/prisma";
import { getSalonStorefront } from "../../lib/salon";
import { getDemoTenantContext } from "../../lib/tenant";
import { addSalonDays, salonDateAtTime, salonDayBounds } from "../../lib/timezone";
import {
  parseServiceIdsFromQuery,
  resolveSelectedServiceIds,
} from "../../lib/validations/booking";

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
  const fromArray = parseServiceIdsFromQuery({ serviceIds: ["cut,color", "gel"] });
  assert(
    fromArray.join(",") === "cut,color,gel",
    "serviceIds as string[] should flatten before split",
  );

  assert(
    resolveSelectedServiceIds({}, ["svc-1", "svc-2"], "svc-1").length === 0,
    "bare /book should not auto-select a catalog service",
  );
  assert(
    resolveSelectedServiceIds({ locationId: "loc-1" }, ["svc-1"], "svc-1").length === 0,
    "location-only query should not auto-select a catalog service",
  );
  assert(
    resolveSelectedServiceIds({ serviceId: "svc-2" }, ["svc-1", "svc-2"], "svc-1").join(",") ===
      "svc-2",
    "serviceId query should select that service, not the catalog fallback",
  );

  const eightIds = Array.from({ length: 8 }, (_, index) => `svc-${index + 1}`);
  const clamped = resolveSelectedServiceIds({ serviceIds: eightIds.join(",") }, eightIds);
  assert(
    clamped.length === MAX_BOOKING_SERVICES,
    `query-initialized lists should clamp to ${MAX_BOOKING_SERVICES} services`,
  );

  const comboLocation = firstLocationWithCapableStaff(
    [{ id: "main" }, { id: "bgc" }],
    [
      { locationId: "main", serviceIds: ["cut"] },
      { locationId: "bgc", serviceIds: ["cut", "gel"] },
    ],
    ["cut", "gel"],
  );
  assert(
    comboLocation === "bgc",
    "Continue should pick the first location whose staff can do the full combo",
  );

  const tenant = await getDemoTenantContext();
  const customer = await prisma.user.findFirstOrThrow({
    where: { email: "customer@beautybook.local" },
  });
  const cut = await prisma.service.findFirstOrThrow({
    where: { organizationId: tenant.organizationId, name: "Haircut" },
  });
  const maya = await prisma.staff.findFirstOrThrow({
    where: { organizationId: tenant.organizationId, name: "Maya Petrova" },
  });
  const alex = await prisma.staff.findFirst({
    where: {
      organizationId: tenant.organizationId,
      name: "Alex Rivera",
      active: false,
    },
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
          serviceIds: [cut.id],
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
        serviceIds: [cut.id],
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
    serviceIds: [cut.id],
    startsAt: bookSlot,
  });

  await expectRejects(
    () =>
      createAppointment({
        organizationId: tenant.organizationId,
        locationId: tenant.locationId,
        customerId: customer.id,
        staffId: maya.id,
        serviceIds: [cut.id],
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
      serviceIds: [cut.id],
      startsAt: parallelSlot,
    }),
    createAppointment({
      organizationId: tenant.organizationId,
      locationId: tenant.locationId,
      customerId: admin.id,
      staffId: maya.id,
      serviceIds: [cut.id],
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

  const color = await prisma.service.findFirstOrThrow({
    where: { organizationId: tenant.organizationId, name: "Hair colour" },
  });
  const gel = await prisma.service.findFirstOrThrow({
    where: { organizationId: tenant.organizationId, name: "Gel manicure" },
  });

  await expectRejects(
    () =>
      createAppointment({
        organizationId: tenant.organizationId,
        locationId: tenant.locationId,
        customerId: customer.id,
        staffId: maya.id,
        serviceIds: [cut.id, gel.id],
        startsAt: bookSlot,
      }),
    "That staff member does not offer every selected service.",
  );

  await expectRejects(
    () =>
      createAppointment({
        organizationId: tenant.organizationId,
        locationId: tenant.locationId,
        customerId: customer.id,
        staffId: maya.id,
        serviceIds: [cut.id, cut.id],
        startsAt: bookSlot,
      }),
    "Each service can only be added once.",
  );

  const comboDuration = cut.durationMin + color.durationMin;
  const comboSlots = await getAvailableSlots({
    organizationId: tenant.organizationId,
    staffId: maya.id,
    durationMin: comboDuration,
    days: 14,
  });
  assert(comboSlots.length > 0, "Maya should have slots for Haircut + Hair colour");
  const comboSlot =
    comboSlots.find((slot) => slot.getTime() > Date.now() + 86_400_000) ??
    comboSlots[comboSlots.length - 1];

  const combo = await createAppointment({
    organizationId: tenant.organizationId,
    locationId: tenant.locationId,
    customerId: customer.id,
    staffId: maya.id,
    serviceIds: [cut.id, color.id],
    startsAt: comboSlot,
  });

  const comboRows = await prisma.appointmentService.findMany({
    where: { appointmentId: combo.id },
    orderBy: { serviceId: "asc" },
  });
  assert(comboRows.length === 2, "Combo booking should create two appointment services");
  const expectedEnd = new Date(comboSlot.getTime() + comboDuration * 60_000);
  assert(
    combo.endsAt.getTime() === expectedEnd.getTime(),
    "Combo booking endsAt should use combined duration",
  );

  const overlapAt = new Date(comboSlot.getTime() + 60 * 60_000);
  await expectRejects(
    () =>
      createAppointment({
        organizationId: tenant.organizationId,
        locationId: tenant.locationId,
        customerId: customer.id,
        staffId: maya.id,
        serviceIds: [cut.id],
        startsAt: overlapAt,
      }),
    "That time is no longer available.",
  );

  await prisma.appointment.delete({ where: { id: combo.id } });

  const extraServices = await Promise.all(
    Array.from({ length: MAX_BOOKING_SERVICES + 1 }, (_, index) =>
      prisma.service.create({
        data: {
          organizationId: tenant.organizationId,
          categoryId: cut.categoryId,
          name: `Cap extra ${index + 1}`,
          durationMin: 15,
          priceCents: 1000,
          active: true,
        },
      }),
    ),
  );
  const longService = await prisma.service.create({
    data: {
      organizationId: tenant.organizationId,
      categoryId: cut.categoryId,
      name: "Cap overtime",
      durationMin: MAX_COMBINED_DURATION_MIN + 1,
      priceCents: 1000,
      active: true,
    },
  });
  await prisma.staffService.createMany({
    data: [...extraServices, longService].map((service) => ({
      staffId: maya.id,
      serviceId: service.id,
    })),
  });

  try {
    await expectRejects(
      () =>
        createAppointment({
          organizationId: tenant.organizationId,
          locationId: tenant.locationId,
          customerId: customer.id,
          staffId: maya.id,
          serviceIds: extraServices.map((service) => service.id),
          startsAt: bookSlot,
        }),
      `You can book at most ${MAX_BOOKING_SERVICES} services.`,
    );

    await expectRejects(
      () =>
        createAppointment({
          organizationId: tenant.organizationId,
          locationId: tenant.locationId,
          customerId: customer.id,
          staffId: maya.id,
          serviceIds: [longService.id],
          startsAt: bookSlot,
        }),
      `Combined duration cannot exceed ${MAX_COMBINED_DURATION_MIN} minutes.`,
    );
  } finally {
    await prisma.staffService.deleteMany({
      where: { serviceId: { in: [...extraServices, longService].map((service) => service.id) } },
    });
    await prisma.service.deleteMany({
      where: { id: { in: [...extraServices, longService].map((service) => service.id) } },
    });
  }

  const inactiveLocation = await prisma.location.create({
    data: {
      organizationId: tenant.organizationId,
      name: "Inactive cap branch",
      active: false,
      isDefault: false,
    },
  });
  const inactiveLocationStaff = await prisma.staff.create({
    data: {
      organizationId: tenant.organizationId,
      locationId: inactiveLocation.id,
      name: "Inactive branch stylist",
      active: true,
    },
  });

  try {
    const salon = await getSalonStorefront("beautybook-demo");
    if (!salon) {
      throw new Error("Demo salon storefront should load");
    }
    assert(
      !salon.staff.some((person) => person.id === inactiveLocationStaff.id),
      "Storefront staff should exclude people at inactive locations",
    );
  } finally {
    await prisma.staff.delete({ where: { id: inactiveLocationStaff.id } });
    await prisma.location.delete({ where: { id: inactiveLocation.id } });
  }

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
