import "dotenv/config";
import { listAdminCatalog, listAdminStaffBoard } from "../../lib/catalog";
import { GLOW_ORG_SLUG } from "../../lib/demo-constants";
import { prisma } from "../../lib/prisma";
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
