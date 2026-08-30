import type { OrgRole } from "@/app/generated/prisma/enums";

const ROLE_RANK: Record<OrgRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  STAFF: 2,
  MEMBER: 1,
};

export function orgRoleAtLeast(role: OrgRole, minimum: OrgRole) {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function isOrgAdminRole(role: OrgRole) {
  return orgRoleAtLeast(role, "ADMIN");
}

export function isOrgStaffRole(role: OrgRole) {
  return orgRoleAtLeast(role, "STAFF");
}
