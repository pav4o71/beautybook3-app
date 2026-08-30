import "dotenv/config";
import { getAvailableSlots } from "../../lib/booking";
import { prisma } from "../../lib/prisma";
import { getDemoTenantContext } from "../../lib/tenant";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const tenant = await getDemoTenantContext();
  const cut = await prisma.service.findFirstOrThrow({ where: { name: "Haircut" } });
  const maya = await prisma.staff.findFirstOrThrow({ where: { name: "Maya Petrova" } });
  const lena = await prisma.staff.findFirstOrThrow({ where: { name: "Lena Dimitrova" } });

  const mayaBefore = await getAvailableSlots({
    organizationId: tenant.organizationId,
    staffId: maya.id,
    durationMin: cut.durationMin,
    days: 7,
  });

  const lenaSaturday = await getAvailableSlots({
    organizationId: tenant.organizationId,
    staffId: lena.id,
    durationMin: cut.durationMin,
    days: 7,
  });

  assert(mayaBefore.length > 0, "Maya should have open slots in the next 7 days");
  assert(
    lenaSaturday.some((slot) => slot.getDay() === 6),
    "Lena should have Saturday slots from seed schedule",
  );

  const blockStart = mayaBefore[0];
  assert(blockStart !== undefined, "Need at least one Maya slot to test time off blocking");

  const timeOffStart = new Date(blockStart);
  timeOffStart.setHours(timeOffStart.getHours() - 1);
  const timeOffEnd = new Date(blockStart.getTime() + cut.durationMin * 60_000 + 60_000);

  const block = await prisma.timeOff.create({
    data: {
      organizationId: tenant.organizationId,
      locationId: tenant.locationId,
      staffId: maya.id,
      startsAt: timeOffStart,
      endsAt: timeOffEnd,
      reason: "verify-script-temp",
    },
  });

  const mayaAfter = await getAvailableSlots({
    organizationId: tenant.organizationId,
    staffId: maya.id,
    durationMin: cut.durationMin,
    days: 7,
  });

  assert(
    mayaAfter.length < mayaBefore.length,
    "Time off should reduce available slot count",
  );

  await prisma.timeOff.delete({ where: { id: block.id } });
  await prisma.$disconnect();

  console.log("verify-slots: ok", {
    mayaBefore: mayaBefore.length,
    mayaAfter: mayaAfter.length,
    lenaSaturdaySlots: lenaSaturday.filter((slot) => slot.getDay() === 6).length,
  });
}

main().catch((error) => {
  console.error("verify-slots: failed", error);
  process.exitCode = 1;
});
