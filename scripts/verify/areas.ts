import "dotenv/config";
import { DEMO_ORG_SLUG, GLOW_ORG_SLUG, LUXE_ORG_SLUG } from "../../lib/demo-constants";
import { isManilaArea, MANILA_AREAS } from "../../lib/areas";
import { prisma } from "../../lib/prisma";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function expectLocationArea(orgSlug: string, locationName: string, area: string) {
  const org = await prisma.organization.findUniqueOrThrow({ where: { slug: orgSlug } });
  const location = await prisma.location.findFirstOrThrow({
    where: { organizationId: org.id, name: locationName },
  });
  assert(
    location.area === area,
    `Expected ${orgSlug} / ${locationName} area to be ${area}, got ${location.area}`,
  );
}

async function main() {
  assert(MANILA_AREAS.includes("Makati"), "MANILA_AREAS must include Makati");
  assert(MANILA_AREAS.includes("BGC (Taguig)"), "MANILA_AREAS must include BGC (Taguig)");
  assert(MANILA_AREAS.includes("Quezon City"), "MANILA_AREAS must include Quezon City");
  assert(MANILA_AREAS.includes("Ortigas"), "MANILA_AREAS must include Ortigas");
  assert(MANILA_AREAS.includes("Parañaque"), "MANILA_AREAS must include Parañaque with ñ");
  assert(MANILA_AREAS.includes("Las Piñas"), "MANILA_AREAS must include Las Piñas with ñ");
  assert(isManilaArea("Makati"), "isManilaArea should accept Makati");
  assert(!isManilaArea("Cebu"), "isManilaArea should reject unknown areas");

  await expectLocationArea(DEMO_ORG_SLUG, "Main location", "Makati");
  await expectLocationArea(DEMO_ORG_SLUG, "BGC branch", "BGC (Taguig)");
  await expectLocationArea(GLOW_ORG_SLUG, "QC Studio", "Quezon City");
  await expectLocationArea(GLOW_ORG_SLUG, "Makati Studio", "Makati");
  await expectLocationArea(LUXE_ORG_SLUG, "Ortigas branch", "Ortigas");

  await prisma.$disconnect();
  console.log("verify-areas: ok", { areaCount: MANILA_AREAS.length });
}

main().catch((error) => {
  console.error("verify-areas: failed", error);
  process.exitCode = 1;
});
