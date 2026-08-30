import "dotenv/config";
import { prisma } from "../../lib/prisma";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const [
    organizations,
    orgMembers,
    categories,
    services,
    activeServices,
    inactiveServices,
    staff,
    inactiveStaff,
    schedules,
    timeOff,
    appointments,
    admin,
    customer,
    mayaSplit,
    deepConditioning,
  ] = await Promise.all([
    prisma.organization.count({ where: { slug: "beautybook-demo" } }),
    prisma.organizationMember.count(),
    prisma.serviceCategory.count({ where: { slug: { in: ["hair", "nails"] } } }),
    prisma.service.count(),
    prisma.service.count({ where: { active: true } }),
    prisma.service.count({ where: { active: false } }),
    prisma.staff.count({ where: { active: true } }),
    prisma.staff.count({ where: { active: false } }),
    prisma.staffSchedule.count(),
    prisma.timeOff.count(),
    prisma.appointment.count({ where: { notes: { startsWith: "seed:" } } }),
    prisma.user.findUnique({ where: { email: "demo@beautybook.local" } }),
    prisma.user.findUnique({ where: { email: "customer@beautybook.local" } }),
    prisma.staffSchedule.count({
      where: {
        staff: { name: "Maya Petrova" },
        weekday: "WED",
      },
    }),
    prisma.service.findFirst({ where: { name: "Deep conditioning" } }),
  ]);

  assert(organizations >= 1, "Expected demo organization");
  assert(orgMembers >= 2, "Expected admin and customer memberships");
  assert(categories >= 2, "Expected at least Hair and Nails categories");
  assert(services >= 4, "Expected at least 4 services including inactive demo");
  assert(activeServices >= 3, "Expected at least 3 active services");
  assert(inactiveServices >= 1, "Expected at least 1 inactive service");
  assert(staff >= 2, "Expected at least 2 active staff");
  assert(inactiveStaff >= 1, "Expected at least 1 inactive staff");
  assert(schedules >= 10, "Expected weekday schedules to be seeded");
  assert(timeOff >= 2, "Expected lunch block and vacation time off");
  assert(appointments >= 5, "Expected seeded demo appointments (today x3, upcoming, past x2)");
  assert(admin?.role === "ADMIN", "Demo admin must have ADMIN role");
  assert(customer?.role === "CUSTOMER", "Demo customer must have CUSTOMER role");
  assert(mayaSplit === 2, "Maya should have split-shift Wednesday rows");
  assert(deepConditioning?.active === false, "Deep conditioning should be inactive");

  const haircut = await prisma.service.findFirstOrThrow({ where: { name: "Haircut" } });
  assert(haircut.priceCents === 35000, "Haircut should be ₱350 (35000 centavos)");

  await prisma.$disconnect();

  console.log("verify-seed-counts: ok", {
    categories,
    services,
    activeServices,
    inactiveServices,
    staff,
    inactiveStaff,
    schedules,
    timeOff,
    appointments,
    mayaSplit,
  });
}

main().catch((error) => {
  console.error("verify-seed-counts: failed", error);
  process.exitCode = 1;
});
