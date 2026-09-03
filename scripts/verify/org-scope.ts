import "dotenv/config";
import { listAdminCatalog, listAdminStaffBoard } from "../../lib/catalog";
import { GLOW_ORG_SLUG } from "../../lib/demo-constants";
import { prisma } from "../../lib/prisma";
import { getStaffTimeOffInRange } from "../../lib/schedule";
import { getDemoTenantContext } from "../../lib/tenant";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const demo = await getDemoTenantContext();
  const glowOrg = await prisma.organization.findUniqueOrThrow({
    where: { slug: GLOW_ORG_SLUG },
  });

  const maya = await prisma.staff.findFirstOrThrow({
    where: { organizationId: demo.organizationId, name: "Maya Petrova" },
  });
  const ana = await prisma.staff.findFirstOrThrow({
    where: { organizationId: glowOrg.id, name: "Ana Cruz" },
  });

  const glowStaff = await listAdminStaffBoard(glowOrg.id);
  assert(
    !glowStaff.some((person) => person.id === maya.id),
    "Glow staff board must not include demo staff",
  );

  const demoStaff = await listAdminStaffBoard(demo.organizationId);
  assert(
    !demoStaff.some((person) => person.id === ana.id),
    "Demo staff board must not include glow staff",
  );

  const demoHaircut = await prisma.service.findFirstOrThrow({
    where: { organizationId: demo.organizationId, name: "Haircut" },
  });
  const glowCatalog = await listAdminCatalog(glowOrg.id);
  const glowServiceIds = glowCatalog.flatMap((category) =>
    category.services.map((service) => service.id),
  );
  assert(
    !glowServiceIds.includes(demoHaircut.id),
    "Glow catalog must not include demo services",
  );

  const demoTimeOff = await prisma.timeOff.findMany({
    where: { organizationId: demo.organizationId, staffId: maya.id },
    take: 1,
  });
  if (demoTimeOff[0]) {
    const leaked = await getStaffTimeOffInRange(
      glowOrg.id,
      maya.id,
      demoTimeOff[0].startsAt,
      demoTimeOff[0].endsAt,
    );
    assert(leaked.length === 0, "Time-off helper must not leak another org's staff blocks");
  }

  try {
    await prisma.location.create({
      data: {
        organizationId: demo.organizationId,
        name: "verify-second-default",
        isDefault: true,
      },
    });
    throw new Error("second default location should be rejected");
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : "";
    assert(code === "P2002", `expected unique default constraint, got ${code || error}`);
  }

  await prisma.$disconnect();

  console.log("verify-org-scope: ok", {
    glowStaff: glowStaff.length,
    demoStaff: demoStaff.length,
  });
}

main().catch((error) => {
  console.error("verify-org-scope: failed", error);
  process.exitCode = 1;
});
