import "dotenv/config";
import { listAdminCatalog, listAdminStaffBoard } from "../../lib/catalog";
import { GLOW_ORG_SLUG } from "../../lib/demo-constants";
import { prisma } from "../../lib/prisma";
import { getStaffTimeOffInRange } from "../../lib/schedule";
import { updateServiceForOrganization } from "../../lib/services";
import { getDemoTenantContext } from "../../lib/tenant";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function verifyServiceCategoryTenantScope() {
  const suffix = `${Date.now()}-${process.pid}`;
  const organizationA = await prisma.organization.create({
    data: { name: `Verify Service A ${suffix}`, slug: `verify-service-a-${suffix}` },
  });
  const organizationB = await prisma.organization.create({
    data: { name: `Verify Service B ${suffix}`, slug: `verify-service-b-${suffix}` },
  });

  try {
    const categoryA = await prisma.serviceCategory.create({
      data: { organizationId: organizationA.id, name: "Category A", slug: "category-a" },
    });
    const categoryB = await prisma.serviceCategory.create({
      data: { organizationId: organizationB.id, name: "Category B", slug: "category-b" },
    });
    const serviceA = await prisma.service.create({
      data: {
        organizationId: organizationA.id,
        categoryId: categoryA.id,
        name: "Service A",
        durationMin: 60,
        priceCents: 1000,
      },
    });

    const update = {
      name: serviceA.name,
      description: serviceA.description,
      durationMin: serviceA.durationMin,
      priceCents: serviceA.priceCents,
      active: serviceA.active,
    };

    await updateServiceForOrganization(organizationA.id, serviceA.id, {
      ...update,
      categoryId: categoryA.id,
    });

    const validUpdate = await prisma.service.findUniqueOrThrow({
      where: { id: serviceA.id },
      select: { organizationId: true, categoryId: true },
    });
    assert(
      validUpdate.organizationId === organizationA.id && validUpdate.categoryId === categoryA.id,
      "service should accept a category from its own organization",
    );

    try {
      await updateServiceForOrganization(organizationA.id, serviceA.id, {
        ...update,
        categoryId: categoryB.id,
      });
      throw new Error("cross-tenant category update should be rejected");
    } catch (error) {
      assert(
        error instanceof Error && error.message === "Category not found.",
        "foreign category must return the safe category-not-found error",
      );
    }

    const [serviceAfter, categoryBAfter] = await Promise.all([
      prisma.service.findUniqueOrThrow({
        where: { id: serviceA.id },
        select: { organizationId: true, categoryId: true },
      }),
      prisma.serviceCategory.findUniqueOrThrow({
        where: { id: categoryB.id },
        select: { organizationId: true, _count: { select: { services: true } } },
      }),
    ]);
    assert(serviceAfter.organizationId === organizationA.id, "service organization must not change");
    assert(serviceAfter.categoryId === categoryA.id, "service category must not change after rejection");
    assert(categoryBAfter.organizationId === organizationB.id, "foreign category organization must not change");
    assert(categoryBAfter._count.services === 0, "foreign category must remain unlinked");
  } finally {
    await prisma.organization.delete({ where: { id: organizationA.id } });
    await prisma.organization.delete({ where: { id: organizationB.id } });
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
  assert(demoTimeOff.length > 0, "Demo seed must include time off for Maya");

  const [firstTimeOff] = demoTimeOff;
  const leaked = await getStaffTimeOffInRange(
    glowOrg.id,
    maya.id,
    firstTimeOff.startsAt,
    firstTimeOff.endsAt,
  );
  assert(leaked.length === 0, "Time-off helper must not leak another org's staff blocks");

  const scoped = await getStaffTimeOffInRange(
    demo.organizationId,
    maya.id,
    firstTimeOff.startsAt,
    firstTimeOff.endsAt,
  );
  assert(scoped.length > 0, "Time-off helper must find staff block within owning org");

  await verifyServiceCategoryTenantScope();

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
