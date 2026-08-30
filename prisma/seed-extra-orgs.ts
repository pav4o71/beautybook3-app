import { OrgRole, Role, Weekday } from "@/app/generated/prisma/enums";
import { auth } from "@/lib/auth";
import {
  DEMO_ACCOUNT,
  GLOW_OWNER,
  LUXE_OWNER,
} from "@/lib/demo-account";
import {
  DEMO_ORG_SLUG,
  GLOW_ORG_SLUG,
  LUXE_ORG_SLUG,
  salonCoverPath,
} from "@/lib/demo-constants";
import { prisma } from "@/lib/prisma";

const WEEKDAYS: Weekday[] = ["MON", "TUE", "WED", "THU", "FRI"];

type TenantContext = {
  organizationId: string;
  locationId: string;
};

async function ensureUser(
  account: { name: string; email: string; password: string },
  role: Role,
) {
  const existing = await prisma.user.findUnique({ where: { email: account.email } });
  if (existing) {
    if (existing.role !== role) {
      await prisma.user.update({ where: { email: account.email }, data: { role } });
    }
    return existing;
  }

  const result = await auth.api.signUpEmail({
    body: {
      name: account.name,
      email: account.email,
      password: account.password,
    },
  });

  if (!result.user) {
    throw new Error(`Better Auth did not return a user for ${account.email}`);
  }

  return prisma.user.update({
    where: { email: account.email },
    data: { role },
  });
}

async function ensureOrg(
  slug: string,
  name: string,
  published: boolean,
  profile?: { description?: string; phone?: string },
) {
  const coverImageUrl = salonCoverPath(slug);
  const description = profile?.description ?? null;
  const phone = profile?.phone ?? null;
  return prisma.organization.upsert({
    where: { slug },
    update: { name, published, coverImageUrl, description, phone },
    create: { name, slug, published, coverImageUrl, description, phone },
  });
}

async function ensureLocation(
  organizationId: string,
  input: {
    name: string;
    address?: string;
    area?: string;
    phone?: string;
    isDefault?: boolean;
  },
) {
  const existing = await prisma.location.findFirst({
    where: { organizationId, name: input.name },
  });

  if (existing) {
    return prisma.location.update({
      where: { id: existing.id },
      data: {
        address: input.address ?? null,
        area: input.area ?? null,
        phone: input.phone ?? existing.phone,
        isDefault: input.isDefault ?? existing.isDefault,
        active: true,
      },
    });
  }

  if (input.isDefault) {
    await prisma.location.updateMany({
      where: { organizationId, isDefault: true },
      data: { isDefault: false },
    });
  }

  return prisma.location.create({
    data: {
      organizationId,
      name: input.name,
      address: input.address ?? null,
      area: input.area ?? null,
      phone: input.phone ?? null,
      isDefault: input.isDefault ?? false,
      active: true,
    },
  });
}

async function seedMembership(userId: string, organizationId: string, role: OrgRole) {
  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId, userId } },
    update: { role },
    create: { organizationId, userId, role },
  });
}

async function upsertCategory(
  tenant: TenantContext,
  slug: string,
  name: string,
  sortOrder: number,
) {
  return prisma.serviceCategory.upsert({
    where: {
      organizationId_slug: { organizationId: tenant.organizationId, slug },
    },
    update: { name, sortOrder },
    create: {
      organizationId: tenant.organizationId,
      slug,
      name,
      sortOrder,
    },
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
  },
) {
  const existing = await prisma.service.findFirst({
    where: {
      organizationId: tenant.organizationId,
      categoryId: input.categoryId,
      name: input.name,
    },
  });

  if (existing) {
    return prisma.service.update({
      where: { id: existing.id },
      data: input,
    });
  }

  return prisma.service.create({
    data: {
      organizationId: tenant.organizationId,
      ...input,
      active: true,
    },
  });
}

async function ensureStaff(
  tenant: TenantContext,
  name: string,
  bio: string,
  serviceIds: string[],
) {
  let staff = await prisma.staff.findFirst({
    where: { organizationId: tenant.organizationId, name },
  });

  if (!staff) {
    staff = await prisma.staff.create({
      data: {
        organizationId: tenant.organizationId,
        locationId: tenant.locationId,
        name,
        bio,
        active: true,
      },
    });
  } else {
    staff = await prisma.staff.update({
      where: { id: staff.id },
      data: { locationId: tenant.locationId, bio, active: true },
    });
  }

  await prisma.staffService.deleteMany({ where: { staffId: staff.id } });
  if (serviceIds.length > 0) {
    await prisma.staffService.createMany({
      data: serviceIds.map((serviceId) => ({ staffId: staff.id, serviceId })),
      skipDuplicates: true,
    });
  }

  for (const weekday of WEEKDAYS) {
    await prisma.staffSchedule.upsert({
      where: {
        staffId_weekday_startTime: {
          staffId: staff.id,
          weekday,
          startTime: "09:00",
        },
      },
      update: { endTime: "17:00" },
      create: {
        staffId: staff.id,
        weekday,
        startTime: "09:00",
        endTime: "17:00",
        organizationId: tenant.organizationId,
        locationId: tenant.locationId,
      },
    });
  }

  return staff;
}

export async function seedDemoSecondLocation() {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { slug: DEMO_ORG_SLUG },
  });

  const bgc = await ensureLocation(org.id, {
    name: "BGC branch",
    address: "Bonifacio Global City, Taguig",
    area: "BGC (Taguig)",
    phone: "+63 2 8888 0102",
    isDefault: false,
  });

  const hair = await prisma.serviceCategory.findFirstOrThrow({
    where: { organizationId: org.id, slug: "hair" },
  });
  const cut = await prisma.service.findFirstOrThrow({
    where: { organizationId: org.id, name: "Haircut" },
  });

  await upsertService(
    { organizationId: org.id, locationId: bgc.id },
    {
      categoryId: hair.id,
      name: "Haircut",
      description: "Wash, cut, and blow-dry",
      durationMin: 45,
      priceCents: 35000,
    },
  );

  await ensureStaff(
    { organizationId: org.id, locationId: bgc.id },
    "Jordan Reyes",
    "BGC stylist — cuts",
    [cut.id],
  );
}

export async function seedGlowNailsStudio() {
  const org = await ensureOrg(GLOW_ORG_SLUG, "Glow Nail Studio", true, {
    description: "Gel and classic nails in Makati and Quezon City. Walk in or book a combined slot online.",
    phone: "+63 2 8888 0200",
  });
  const makati = await ensureLocation(org.id, {
    name: "Makati Studio",
    address: "Poblacion, Makati",
    area: "Makati",
    phone: "+63 2 8888 0201",
    isDefault: true,
  });
  const qc = await ensureLocation(org.id, {
    name: "QC Studio",
    address: "Katipunan, Quezon City",
    area: "Quezon City",
    phone: "+63 2 8888 0202",
  });

  const owner = await ensureUser(GLOW_OWNER, Role.ADMIN);
  await seedMembership(owner.id, org.id, OrgRole.OWNER);

  const nails = await upsertCategory(
    { organizationId: org.id, locationId: makati.id },
    "nails",
    "Nails",
    1,
  );
  const gel = await upsertService(
    { organizationId: org.id, locationId: makati.id },
    {
      categoryId: nails.id,
      name: "Gel manicure",
      description: "Shape, gel polish, and care",
      durationMin: 60,
      priceCents: 45000,
    },
  );
  const pedicure = await upsertService(
    { organizationId: org.id, locationId: makati.id },
    {
      categoryId: nails.id,
      name: "Pedicure",
      description: "Relaxing foot care and polish",
      durationMin: 50,
      priceCents: 40000,
    },
  );

  await ensureStaff(
    { organizationId: org.id, locationId: makati.id },
    "Ana Cruz",
    "Makati nail technician",
    [gel.id, pedicure.id],
  );
  await ensureStaff(
    { organizationId: org.id, locationId: qc.id },
    "Bea Santos",
    "QC nail technician",
    [gel.id],
  );
}

export async function seedLuxeHairLounge() {
  const org = await ensureOrg(LUXE_ORG_SLUG, "Luxe Hair Lounge", true, {
    description: "Precision cuts and blowouts in Ortigas. Book one or more services in a single slot.",
    phone: "+63 2 8888 0300",
  });
  const ortigas = await ensureLocation(org.id, {
    name: "Ortigas branch",
    address: "Ortigas Center, Pasig",
    area: "Ortigas",
    phone: "+63 2 8888 0301",
    isDefault: true,
  });

  const owner = await ensureUser(LUXE_OWNER, Role.ADMIN);
  await seedMembership(owner.id, org.id, OrgRole.OWNER);

  const hair = await upsertCategory(
    { organizationId: org.id, locationId: ortigas.id },
    "hair",
    "Hair",
    1,
  );
  const cut = await upsertService(
    { organizationId: org.id, locationId: ortigas.id },
    {
      categoryId: hair.id,
      name: "Haircut",
      description: "Precision cut and style",
      durationMin: 45,
      priceCents: 55000,
    },
  );
  const blowout = await upsertService(
    { organizationId: org.id, locationId: ortigas.id },
    {
      categoryId: hair.id,
      name: "Blowout",
      description: "Wash and blow-dry styling",
      durationMin: 40,
      priceCents: 40000,
    },
  );

  await ensureStaff(
    { organizationId: org.id, locationId: ortigas.id },
    "Carlos Mendoza",
    "Senior stylist — cuts and blowouts",
    [cut.id, blowout.id],
  );
}

export async function seedMarketplaceSalons() {
  await seedDemoSecondLocation();
  await seedGlowNailsStudio();
  await seedLuxeHairLounge();
  console.log("Seeded extra marketplace salons, locations, and owners");
}
