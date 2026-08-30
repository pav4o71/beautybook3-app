import "dotenv/config";
import { getAvailableSlots, getAvailableSlotsForDay } from "../../lib/booking";
import { GLOW_ORG_SLUG } from "../../lib/demo-constants";
import { searchMarketplaceAvailability } from "../../lib/marketplace";
import { prisma } from "../../lib/prisma";
import { salonDayBounds } from "../../lib/timezone";
import { formatTime } from "../../lib/format";
import { getDemoTenantContext } from "../../lib/tenant";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const tenant = await getDemoTenantContext();
  const cut = await prisma.service.findFirstOrThrow({
    where: { organizationId: tenant.organizationId, name: "Haircut" },
  });
  const maya = await prisma.staff.findFirstOrThrow({
    where: { organizationId: tenant.organizationId, name: "Maya Petrova" },
  });

  const weekSlots = await getAvailableSlots({
    organizationId: tenant.organizationId,
    staffId: maya.id,
    durationMin: cut.durationMin,
    days: 7,
  });
  assert(weekSlots.length > 0, "Maya should have open slots in the next 7 days");

  const date = weekSlots[0];
  const daySlots = await getAvailableSlotsForDay({
    organizationId: tenant.organizationId,
    staffId: maya.id,
    durationMin: cut.durationMin,
    date,
  });


  assert(daySlots.length > 0, "Maya should have slots on a day that already has 7-day availability");
  const { start, end } = salonDayBounds(date);
  assert(
    daySlots.every((slot) => slot >= start && slot < end),
    "Day slots must stay on the requested Manila calendar day",
  );
  assert(
    daySlots.every((slot) => weekSlots.some((week) => week.getTime() === slot.getTime())),
    "Day slots must be a subset of the 7-day window",
  );

  const results = await searchMarketplaceAvailability({
    categorySlug: "hair",
    date,
  });
  assert(results.length > 0, "Hair availability search should return slots");
  assert(results.length <= 50, "Availability search must cap at 50 results");
  assert(
    results.every((row) => row.organization.slug.length > 0 && row.staff.id && row.startsAt),
    "Availability rows must include org, staff, and startsAt",
  );
  assert(
    results.some((row) => row.organization.slug === "beautybook-demo" && row.service.name === "Haircut"),
    "Demo haircut must appear in availability results",
  );
  assert(
    !results.some((row) => row.organization.slug === GLOW_ORG_SLUG),
    "Hair availability must not include Glow Nail Studio",
  );

  const timed = await searchMarketplaceAvailability({
    categorySlug: "hair",
    date,
    time: "10:00",
  });
  assert(timed.length > 0, "10:00 hair search should keep nearby slots");
  assert(
    timed.every((row) => {
      const [hours, minutes] = formatTime(row.startsAt).split(":").map(Number);
      return Math.abs(hours * 60 + minutes - 10 * 60) <= 30;
    }),
    "Time filter must keep slots within ±30 minutes",
  );

  await prisma.$disconnect();
  console.log("verify-marketplace-availability: ok", {
    daySlots: daySlots.length,
    results: results.length,
    timed: timed.length,
  });
}

main().catch((error) => {
  console.error("verify-marketplace-availability: failed", error);
  process.exitCode = 1;
});
