import "dotenv/config";
import assert from "node:assert";
import { prisma } from "../../lib/prisma";
import { assertLocalOnlyDatabaseUrl } from "../../lib/test-only-local-db";
import { linkGuestAppointmentsToVerifiedUser } from "../../lib/link-guest-appointments";
import { Role } from "../../app/generated/prisma/enums";

assertLocalOnlyDatabaseUrl(process.env.DATABASE_URL);

async function main() {
  console.log("verify-customer-auth: starting...");

  const testEmail = `a5.test.${Date.now()}@example.com`;
  const otherEmail = `a5.other.${Date.now()}@example.com`;

  // 1. Create a customer user directly or via model
  const user = await prisma.user.create({
    data: {
      id: `usr_test_${Date.now()}`,
      name: "A5 Test Customer",
      email: testEmail,
      emailVerified: false,
      role: Role.CUSTOMER,
    },
  });

  // Verify zero organization memberships
  const memberships = await prisma.organizationMember.findMany({
    where: { userId: user.id },
  });
  assert.strictEqual(memberships.length, 0, "Customer signup must have 0 organization memberships");
  assert.strictEqual(user.role, Role.CUSTOMER, "New user role must be CUSTOMER");

  // 2. Create guest appointments with matching email (one uppercase, one lowercase)
  const org = await prisma.organization.findFirstOrThrow();
  const location = await prisma.location.findFirstOrThrow({ where: { organizationId: org.id } });
  const staff = await prisma.staff.findFirstOrThrow({ where: { organizationId: org.id } });

  const guestAppt1 = await prisma.appointment.create({
    data: {
      organizationId: org.id,
      locationId: location.id,
      staffId: staff.id,
      customerId: null,
      customerEmail: testEmail.toUpperCase(),
      customerName: "A5 Test Guest",
      customerPhone: "+639170000001",
      startsAt: new Date(Date.now() + 86400000),
      endsAt: new Date(Date.now() + 90000000),
      status: "CONFIRMED",
    },
  });

  // Appointment already owned by someone else
  const otherUser = await prisma.user.create({
    data: {
      id: `usr_other_${Date.now()}`,
      name: "Other User",
      email: otherEmail,
      emailVerified: true,
      role: Role.CUSTOMER,
    },
  });

  const ownedAppt = await prisma.appointment.create({
    data: {
      organizationId: org.id,
      locationId: location.id,
      staffId: staff.id,
      customerId: otherUser.id,
      customerEmail: testEmail, // Same email snapshot, but ALREADY owned by another user!
      customerName: "Imposter",
      customerPhone: "+639170000002",
      startsAt: new Date(Date.now() + 172800000),
      endsAt: new Date(Date.now() + 176400000),
      status: "CONFIRMED",
    },
  });

  // 3. Test linkGuestAppointmentsToVerifiedUser
  const linkResult = await linkGuestAppointmentsToVerifiedUser(user.id, testEmail);
  assert.strictEqual(linkResult.linked, 1, "Should link exactly 1 unowned matching appointment");

  // Verify guestAppt1 is now linked to user.id
  const updatedAppt1 = await prisma.appointment.findUniqueOrThrow({ where: { id: guestAppt1.id } });
  assert.strictEqual(updatedAppt1.customerId, user.id, "guestAppt1 customerId must be updated to user.id");

  // Verify ownedAppt was NOT reassigned
  const updatedOwnedAppt = await prisma.appointment.findUniqueOrThrow({ where: { id: ownedAppt.id } });
  assert.strictEqual(updatedOwnedAppt.customerId, otherUser.id, "Already-owned appointment MUST NOT be reassigned");

  // 4. Test idempotency
  const relinkResult = await linkGuestAppointmentsToVerifiedUser(user.id, testEmail);
  assert.strictEqual(relinkResult.linked, 0, "Idempotent relink should return 0 new linked appointments");

  // Cleanup test records
  await prisma.appointment.deleteMany({
    where: { id: { in: [guestAppt1.id, ownedAppt.id] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [user.id, otherUser.id] } },
  });

  console.log("verify-customer-auth: ok");
}

main().catch((err) => {
  console.error("verify-customer-auth failed:", err);
  process.exit(1);
});
