import "dotenv/config";
import type { OrgRole } from "../../app/generated/prisma/enums";
import { isOrgAdminRole } from "../../lib/org-roles";
import { prisma } from "../../lib/prisma";
import { assertSafeVerifyTarget } from "./assert-safe-target";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

/**
  * Pure gate simulation replicating requireActiveOrgAdmin() and dashboard nav checks.
  * Ensures authorization is strictly bound to active tenant membership role,
  * ignoring any legacy global User.role.
  */
function canAdministerOrg(
  user: { role: string },
  membership: { role: OrgRole } | null,
): boolean {
  if (!membership) {
    return false;
  }
  return isOrgAdminRole(membership.role);
}

// 1. OWNER member -> allowed
assert(isOrgAdminRole("OWNER"), "OWNER must be recognized as org admin");
assert(
  canAdministerOrg({ role: "USER" }, { role: "OWNER" }),
  "OWNER member without global admin must be allowed org admin access",
);

// 2. ADMIN organization member -> allowed
assert(isOrgAdminRole("ADMIN"), "ADMIN must be recognized as org admin");
assert(
  canAdministerOrg({ role: "USER" }, { role: "ADMIN" }),
  "ADMIN member without global admin must be allowed org admin access",
);

// 3. STAFF organization member -> denied
assert(!isOrgAdminRole("STAFF"), "STAFF must NOT be an org admin");
assert(
  !canAdministerOrg({ role: "USER" }, { role: "STAFF" }),
  "STAFF member must be denied org admin access",
);

// 4. User with legacy global ADMIN but without organization-admin membership -> denied
assert(
  !canAdministerOrg({ role: "ADMIN" }, { role: "MEMBER" }),
  "Legacy global ADMIN with MEMBER role must be denied org admin access",
);
assert(
  !canAdministerOrg({ role: "ADMIN" }, { role: "STAFF" }),
  "Legacy global ADMIN with STAFF role must be denied org admin access",
);
assert(
  !canAdministerOrg({ role: "ADMIN" }, null),
  "Legacy global ADMIN with no membership in org must be denied org admin access",
);

// 5. User cannot administer another organization merely because of global user role
const globalAdminUser = { role: "ADMIN" };
const orgAMembership = { role: "OWNER" as OrgRole };
const orgBNoMembership = null;
const orgBMemberOnly = { role: "MEMBER" as OrgRole };

assert(
  canAdministerOrg(globalAdminUser, orgAMembership),
  "Allowed on Org A because of explicit OWNER role",
);
assert(
  !canAdministerOrg(globalAdminUser, orgBNoMembership),
  "Denied on Org B where user has no membership despite global ADMIN role",
);
assert(
  !canAdministerOrg(globalAdminUser, orgBMemberOnly),
  "Denied on Org B where user is only a MEMBER despite global ADMIN role",
);

async function verifyDatabaseMemberships() {
  assertSafeVerifyTarget();

  const demoAdmin = await prisma.user.findFirst({
    where: { email: "demo@beautybook.local" },
    include: { organizationMembers: true },
  });
  assert(demoAdmin !== null, "Demo admin must exist in seed");
  const demoOwnerMembership = demoAdmin.organizationMembers.find(
    (m) => m.role === "OWNER",
  );
  assert(
    demoOwnerMembership !== undefined,
    "Demo admin must hold OWNER membership in demo organization",
  );
  assert(
    isOrgAdminRole(demoOwnerMembership.role),
    "Demo admin OWNER membership grants org admin access",
  );

  const demoCustomer = await prisma.user.findFirst({
    where: { email: "customer@beautybook.local" },
    include: { organizationMembers: true },
  });
  assert(demoCustomer !== null, "Demo customer must exist in seed");
  for (const m of demoCustomer.organizationMembers) {
    assert(
      !isOrgAdminRole(m.role),
      `Customer membership with role ${m.role} must not grant org admin access`,
    );
  }
}

async function main() {
  await verifyDatabaseMemberships();
  console.log("verify-org-roles: ok");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
