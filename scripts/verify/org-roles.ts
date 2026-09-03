import { isOrgAdminRole } from "../../lib/org-roles";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(isOrgAdminRole("OWNER"), "OWNER is an org admin");
assert(isOrgAdminRole("ADMIN"), "ADMIN is an org admin");
assert(!isOrgAdminRole("STAFF"), "STAFF is not an org admin");
assert(
  !isOrgAdminRole("MEMBER"),
  "MEMBER is not an org admin even if User.role is leftover ADMIN",
);

console.log("verify-org-roles: ok");
