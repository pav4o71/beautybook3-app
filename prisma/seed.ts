import { AppointmentStatus, OrgRole, Role, Weekday } from "@/app/generated/prisma/enums";
import { auth } from "@/lib/auth";
import { DEMO_ACCOUNT, DEMO_CUSTOMER } from "@/lib/demo-account";
import { DEMO_ORG_SLUG } from "@/lib/demo-constants";
import { prisma } from "@/lib/prisma";
import {
  addSalonDays,
  salonDateAtTime,
  salonDayBounds,
  salonWeekdayFromDate,
} from "@/lib/timezone";

const WEEKDAYS: Weekday[] = ["MON", "TUE", "WED", "THU", "FRI"];

const JS_TO_SALON_WEEKDAY: Weekday[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

type TenantContext = {
  organizationId: string;
  locationId: string;
};

function nextWeekday(targetDay: number) {
  const { start: todayStart } = salonDayBounds();
  let cursor = todayStart;

  for (let step = 1; step <= 7; step += 1) {
    cursor = addSalonDays(todayStart, step);
    const weekdayIndex = JS_TO_SALON_WEEKDAY.indexOf(salonWeekdayFromDate(cursor));
    if (weekdayIndex === targetDay) {
      return cursor;
    }
  }

  return addSalonDays(todayStart, 7);
}

function atSalonTime(day: Date, hours: number, minutes: number) {
  return salonDateAtTime(day, hours, minutes);
}

async function seedOrganization(): Promise<TenantContext> {
  const org = await prisma.organization.upsert({
    where: { slug: DEMO_ORG_SLUG },
    update: { name: "BeautyBook Demo Salon", published: true },
    create: {
      name: "BeautyBook Demo Salon",
      slug: DEMO_ORG_SLUG,
      published: true,
    },
  });

  let location = await prisma.location.findFirst({
    where: { organizationId: org.id, isDefault: true },
  });

  if (!location) {
    location = await prisma.location.create({
      data: {
        organizationId: org.id,
        name: "Main location",
        isDefault: true,
      },
    });
  }

  return { organizationId: org.id, locationId: location.id };
}

async function seedMembership(userId: string, organizationId: string, role: OrgRole) {
  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: { organizationId, userId },
    },
    update: { role },
    create: { organizationId, userId, role },
  });
}

async function upsertStaffSchedule(
  tenant: TenantContext,
  staffId: string,
  weekday: Weekday,
  startTime: string,
  endTime: string,
) {
  await prisma.staffSchedule.upsert({
    where: {
      staffId_weekday_startTime: {
        staffId,
        weekday,
        startTime,
      },
    },
    update: { endTime },
    create: {
      staffId,
      weekday,
      startTime,
      endTime,
      organizationId: tenant.organizationId,
      locationId: tenant.locationId,
    },
  });
}

async function replaceWeekdaySchedule(
  tenant: TenantContext,
  staffId: string,
  weekday: Weekday,
  windows: { startTime: string; endTime: string }[],
) {
  await prisma.staffSchedule.deleteMany({ where: { staffId, weekday } });
  for (const window of windows) {
    await prisma.staffSchedule.create({
      data: {
        staffId,
        weekday,
        startTime: window.startTime,
        endTime: window.endTime,
        organizationId: tenant.organizationId,
        locationId: tenant.locationId,
      },
    });
  }
}

async function upsertTimeOff(
  tenant: TenantContext,
  staffId: string,
  reason: string,
  startsAt: Date,
  endsAt: Date,
) {
  const existing = await prisma.timeOff.findFirst({
    where: { staffId, reason },
  });

  if (existing) {
    return prisma.timeOff.update({
      where: { id: existing.id },
      data: { startsAt, endsAt },
    });
  }

  return prisma.timeOff.create({
    data: {
      staffId,
      reason,
      startsAt,
      endsAt,
      organizationId: tenant.organizationId,
      locationId: tenant.locationId,
    },
  });
}

async function seedDemoUser() {
  const existing = await prisma.user.findUnique({
    where: { email: DEMO_ACCOUNT.email },
  });

  if (existing) {
    if (existing.role !== Role.ADMIN) {
      await prisma.user.update({
        where: { email: DEMO_ACCOUNT.email },
        data: { role: Role.ADMIN },
      });
    }

    console.log(`Demo admin already exists: ${DEMO_ACCOUNT.email}`);
    return existing;
  }

  const result = await auth.api.signUpEmail({
    body: {
      name: DEMO_ACCOUNT.name,
      email: DEMO_ACCOUNT.email,
      password: DEMO_ACCOUNT.password,
    },
  });

  if (!result.user) {
    throw new Error("Better Auth did not return a user for the demo admin");
  }

  return prisma.user.update({
    where: { email: DEMO_ACCOUNT.email },
    data: { role: Role.ADMIN },
  });
}

async function seedDemoCustomer() {
  const existing = await prisma.user.findUnique({
    where: { email: DEMO_CUSTOMER.email },
  });

  if (existing) {
    if (existing.role !== Role.CUSTOMER) {
      await prisma.user.update({
        where: { email: DEMO_CUSTOMER.email },
        data: { role: Role.CUSTOMER },
      });
    }

    console.log(`Demo customer already exists: ${DEMO_CUSTOMER.email}`);
    return existing;
  }

  const result = await auth.api.signUpEmail({
    body: {
      name: DEMO_CUSTOMER.name,
      email: DEMO_CUSTOMER.email,
      password: DEMO_CUSTOMER.password,
    },
  });

  if (!result.user) {
    throw new Error("Better Auth did not return a user for the demo customer");
  }

  return prisma.user.update({
    where: { email: DEMO_CUSTOMER.email },
    data: { role: Role.CUSTOMER },
  });
}

async function upsertService(
  tenant: TenantContext,
  input: {
    categoryId: string;
    name: string;
    description: string;
    durationMin: number;
    priceCents: number;
    active?: boolean;
  },
) {
  const existing = await prisma.service.findFirst({
    where: {
      name: input.name,
      categoryId: input.categoryId,
      organizationId: tenant.organizationId,
    },
  });

  if (existing) {
    return prisma.service.update({
      where: { id: existing.id },
      data: {
        description: input.description,
        durationMin: input.durationMin,
        priceCents: input.priceCents,
        active: input.active ?? true,
      },
    });
  }

  return prisma.service.create({
    data: {
      organizationId: tenant.organizationId,
      categoryId: input.categoryId,
      name: input.name,
      description: input.description,
      durationMin: input.durationMin,
      priceCents: input.priceCents,
      active: input.active ?? true,
    },
  });
}

async function findOrCreateStaff(
  tenant: TenantContext,
  name: string,
  bio: string,
  active = true,
) {
  const existing = await prisma.staff.findFirst({
    where: { name, organizationId: tenant.organizationId },
  });
  if (existing) {
    return prisma.staff.update({
      where: { id: existing.id },
      data: { bio, active },
    });
  }
  return prisma.staff.create({
    data: {
      organizationId: tenant.organizationId,
      locationId: tenant.locationId,
      name,
      bio,
      active,
    },
  });
}

async function upsertSeedAppointment(
  tenant: TenantContext,
  input: {
    marker: string;
    customerId: string;
    staffId: string;
    serviceId: string;
    startsAt: Date;
    durationMin: number;
    priceCents: number;
    status: AppointmentStatus;
  },
) {
  const existing = await prisma.appointment.findFirst({
    where: { notes: input.marker },
  });

  const endsAt = new Date(input.startsAt.getTime() + input.durationMin * 60_000);

  if (existing) {
    await prisma.appointmentService.deleteMany({
      where: { appointmentId: existing.id },
    });
    await prisma.appointment.update({
      where: { id: existing.id },
      data: {
        customerId: input.customerId,
        staffId: input.staffId,
        organizationId: tenant.organizationId,
        locationId: tenant.locationId,
        startsAt: input.startsAt,
        endsAt,
        status: input.status,
      },
    });
    await prisma.appointmentService.create({
      data: {
        appointmentId: existing.id,
        serviceId: input.serviceId,
        durationMin: input.durationMin,
        priceCents: input.priceCents,
      },
    });
    return existing;
  }

  return prisma.appointment.create({
    data: {
      organizationId: tenant.organizationId,
      locationId: tenant.locationId,
      customerId: input.customerId,
      staffId: input.staffId,
      startsAt: input.startsAt,
      endsAt,
      status: input.status,
      notes: input.marker,
      services: {
        create: {
          serviceId: input.serviceId,
          durationMin: input.durationMin,
          priceCents: input.priceCents,
        },
      },
    },
  });
}

async function seedCatalogAndStaff(tenant: TenantContext, customerId: string) {
  const hair = await prisma.serviceCategory.upsert({
    where: {
      organizationId_slug: { organizationId: tenant.organizationId, slug: "hair" },
    },
    update: { name: "Hair", sortOrder: 1 },
    create: {
      organizationId: tenant.organizationId,
      slug: "hair",
      name: "Hair",
      sortOrder: 1,
    },
  });

  const nails = await prisma.serviceCategory.upsert({
    where: {
      organizationId_slug: { organizationId: tenant.organizationId, slug: "nails" },
    },
    update: { name: "Nails", sortOrder: 2 },
    create: {
      organizationId: tenant.organizationId,
      slug: "nails",
      name: "Nails",
      sortOrder: 2,
    },
  });

  const cut = await upsertService(tenant, {
    categoryId: hair.id,
    name: "Haircut",
    description: "Wash, cut, and blow-dry",
    durationMin: 45,
    priceCents: 35000,
  });

  const color = await upsertService(tenant, {
    categoryId: hair.id,
    name: "Hair colour",
    description: "Full colour with finish",
    durationMin: 90,
    priceCents: 180000,
  });

  const gel = await upsertService(tenant, {
    categoryId: nails.id,
    name: "Gel manicure",
    description: "Shape, gel polish, and care",
    durationMin: 60,
    priceCents: 45000,
  });

  await upsertService(tenant, {
    categoryId: hair.id,
    name: "Deep conditioning",
    description: "Inactive demo service for testing",
    durationMin: 30,
    priceCents: 25000,
    active: false,
  });

  const maya = await findOrCreateStaff(
    tenant,
    "Maya Petrova",
    "Senior stylist — cuts and colour",
    true,
  );
  const lena = await findOrCreateStaff(
    tenant,
    "Lena Dimitrova",
    "Nail technician — also offers haircuts",
    true,
  );
  await findOrCreateStaff(tenant, "Alex Rivera", "Inactive stylist — demo only", false);

  await prisma.staffService.createMany({
    data: [
      { staffId: maya.id, serviceId: cut.id },
      { staffId: maya.id, serviceId: color.id },
      { staffId: lena.id, serviceId: gel.id },
      { staffId: lena.id, serviceId: cut.id },
    ],
    skipDuplicates: true,
  });

  for (const staff of [maya, lena]) {
    for (const weekday of WEEKDAYS) {
      await upsertStaffSchedule(tenant, staff.id, weekday, "09:00", "17:00");
    }
  }

  await replaceWeekdaySchedule(tenant, maya.id, "WED", [
    { startTime: "09:00", endTime: "12:00" },
    { startTime: "13:00", endTime: "17:00" },
  ]);

  await upsertStaffSchedule(tenant, lena.id, "SAT", "10:00", "14:00");

  const nextMonday = nextWeekday(1);
  await upsertTimeOff(
    tenant,
    maya.id,
    "seed:lunch-block",
    atSalonTime(nextMonday, 12, 0),
    atSalonTime(nextMonday, 13, 0),
  );

  const vacationStart = atSalonTime(nextWeekday(2), 0, 0);
  const vacationEnd = atSalonTime(nextWeekday(4), 23, 59);
  await upsertTimeOff(tenant, lena.id, "seed:vacation", vacationStart, vacationEnd);

  const { start: today } = salonDayBounds();
  await prisma.appointment.deleteMany({ where: { notes: "seed:today-confirmed" } });
  await upsertSeedAppointment(tenant, {
    marker: "seed:today-complete",
    customerId,
    staffId: lena.id,
    serviceId: gel.id,
    startsAt: atSalonTime(today, 14, 0),
    durationMin: gel.durationMin,
    priceCents: gel.priceCents,
    status: AppointmentStatus.CONFIRMED,
  });
  await upsertSeedAppointment(tenant, {
    marker: "seed:today-no-show",
    customerId,
    staffId: lena.id,
    serviceId: cut.id,
    startsAt: atSalonTime(today, 15, 0),
    durationMin: cut.durationMin,
    priceCents: cut.priceCents,
    status: AppointmentStatus.CONFIRMED,
  });
  await upsertSeedAppointment(tenant, {
    marker: "seed:today-cancel",
    customerId,
    staffId: maya.id,
    serviceId: cut.id,
    startsAt: atSalonTime(today, 16, 0),
    durationMin: cut.durationMin,
    priceCents: cut.priceCents,
    status: AppointmentStatus.CONFIRMED,
  });

  const upcomingTuesday = nextWeekday(2);
  await upsertSeedAppointment(tenant, {
    marker: "seed:upcoming-confirmed",
    customerId,
    staffId: maya.id,
    serviceId: cut.id,
    startsAt: atSalonTime(upcomingTuesday, 10, 0),
    durationMin: cut.durationMin,
    priceCents: cut.priceCents,
    status: AppointmentStatus.CONFIRMED,
  });

  const pastMonday = addSalonDays(nextMonday, -7);
  await upsertSeedAppointment(tenant, {
    marker: "seed:past-completed",
    customerId,
    staffId: lena.id,
    serviceId: gel.id,
    startsAt: atSalonTime(pastMonday, 11, 0),
    durationMin: gel.durationMin,
    priceCents: gel.priceCents,
    status: AppointmentStatus.COMPLETED,
  });

  const pastTuesday = addSalonDays(pastMonday, 1);
  await upsertSeedAppointment(tenant, {
    marker: "seed:past-no-show",
    customerId,
    staffId: maya.id,
    serviceId: cut.id,
    startsAt: atSalonTime(pastTuesday, 9, 30),
    durationMin: cut.durationMin,
    priceCents: cut.priceCents,
    status: AppointmentStatus.NO_SHOW,
  });

  console.log(
    "Seeded catalog, staff, schedules, time off, inactive demos, and appointments",
  );
}

async function main() {
  const tenant = await seedOrganization();
  const admin = await seedDemoUser();
  const customer = await seedDemoCustomer();
  await seedMembership(admin.id, tenant.organizationId, OrgRole.OWNER);
  await seedMembership(customer.id, tenant.organizationId, OrgRole.MEMBER);
  await seedCatalogAndStaff(tenant, customer.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
