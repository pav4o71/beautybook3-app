import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { DEMO_CUSTOMER, ZERO_ORG_CUSTOMER } from "../lib/demo-account";
import { DEMO_ORG_SLUG, GLOW_ORG_SLUG } from "../lib/demo-constants";
import { assertLocalOnlyDatabase } from "../lib/test-only-local-db";

assertLocalOnlyDatabase();
const database = new Pool({ connectionString: process.env.DATABASE_URL });
const TEST_CUSTOMER_NAMES = [
  "Zero Org Booking Customer",
  "Member Cross-Salon Customer",
];

async function deleteTestAppointments() {
  await database.query(
    'DELETE FROM "Appointment" WHERE "customerName" = ANY($1::text[])',
    [TEST_CUSTOMER_NAMES],
  );
}

test.beforeAll(async () => {
  await deleteTestAppointments();
});

test.afterAll(async () => {
  await deleteTestAppointments();
  await database.end();
});

async function findUserId(email: string) {
  const result = await database.query<{ id: string }>(
    'SELECT id FROM "user" WHERE email = $1',
    [email],
  );
  const user = result.rows[0];
  if (!user) {
    throw new Error(`Expected seeded user ${email}`);
  }
  return user.id;
}

async function membershipCount(userId: string, organizationSlug?: string) {
  const result = await database.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
       FROM "OrganizationMember" membership
       JOIN "Organization" organization
         ON organization.id = membership."organizationId"
      WHERE membership."userId" = $1
        AND ($2::text IS NULL OR organization.slug = $2)`,
    [userId, organizationSlug ?? null],
  );
  return Number(result.rows[0]?.count ?? 0);
}

async function latestAppointmentCustomerId(input: {
  userId: string;
  organizationSlug: string;
  customerName: string;
}) {
  const result = await database.query<{ customerId: string | null }>(
    `SELECT appointment."customerId"
       FROM "Appointment" appointment
       JOIN "Organization" organization
         ON organization.id = appointment."organizationId"
      WHERE appointment."customerId" = $1
        AND organization.slug = $2
        AND appointment."customerName" = $3
      ORDER BY appointment."createdAt" DESC
      LIMIT 1`,
    [input.userId, input.organizationSlug, input.customerName],
  );
  return result.rows[0]?.customerId ?? null;
}

async function signIn(
  page: import("@playwright/test").Page,
  account: { email: string; password: string },
) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(account.email);
  await page.locator('input[name="password"]').fill(account.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(dashboard|account)/);
}

async function bookPublicAppointment(
  page: import("@playwright/test").Page,
  input: {
    orgSlug: string;
    serviceName: RegExp;
    staffName: RegExp;
    customerName: string;
    phone: string;
  },
) {
  await page.goto(`/s/${input.orgSlug}/book`);
  await page.getByRole("button", { name: input.serviceName }).click();
  await page.getByRole("button", { name: input.staffName }).click();
  await page.waitForLoadState("networkidle");

  await page.getByTestId("customer-name-input").fill(input.customerName);
  await page.getByTestId("customer-phone-input").fill(input.phone);

  const slot = page.getByTestId("book-slot").first();
  await expect(slot).toBeVisible({ timeout: 15_000 });

  await Promise.all([
    page.waitForURL("/account?booked=1", { timeout: 45_000 }),
    slot.click(),
  ]);
}

test.describe("authenticated public booking redirect", () => {
  test("zero-org customer lands on account with a customer-owned appointment", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const customerId = await findUserId(ZERO_ORG_CUSTOMER.email);
    expect(await membershipCount(customerId)).toBe(0);

    await signIn(page, ZERO_ORG_CUSTOMER);
    const publicBookingNavigations: string[] = [];
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) {
        publicBookingNavigations.push(new URL(frame.url()).pathname);
      }
    });
    await bookPublicAppointment(page, {
      orgSlug: DEMO_ORG_SLUG,
      serviceName: /Haircut/i,
      staffName: /Maya Petrova/i,
      customerName: "Zero Org Booking Customer",
      phone: `0917 10${Date.now().toString().slice(-5)}`,
    });

    await expect(page).toHaveURL("/account?booked=1");
    await expect(page.getByRole("heading", { name: "My account" })).toBeVisible();
    await expect(page.getByText(/Booked! Pay at the salon/i)).toBeVisible();
    await expect(page.getByText("BeautyBook Demo Salon")).toBeVisible();
    await expect(page.getByText("Haircut")).toBeVisible();
    expect(publicBookingNavigations).not.toContain("/onboarding");
    expect(publicBookingNavigations.some((path) => path.startsWith("/dashboard"))).toBe(
      false,
    );

    expect(
      await latestAppointmentCustomerId({
        userId: customerId,
        organizationSlug: DEMO_ORG_SLUG,
        customerName: "Zero Org Booking Customer",
      }),
    ).toBe(customerId);
    expect(await membershipCount(customerId)).toBe(0);
  });

  test("organization member booking another salon still lands on customer account", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const customerId = await findUserId(DEMO_CUSTOMER.email);
    expect(await membershipCount(customerId)).toBeGreaterThan(0);
    expect(await membershipCount(customerId, GLOW_ORG_SLUG)).toBe(0);

    await signIn(page, DEMO_CUSTOMER);
    const publicBookingNavigations: string[] = [];
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) {
        publicBookingNavigations.push(new URL(frame.url()).pathname);
      }
    });
    await bookPublicAppointment(page, {
      orgSlug: GLOW_ORG_SLUG,
      serviceName: /Gel manicure/i,
      staffName: /Ana Cruz/i,
      customerName: "Member Cross-Salon Customer",
      phone: `0918 10${Date.now().toString().slice(-5)}`,
    });

    await expect(page).toHaveURL("/account?booked=1");
    const glowAppointment = page.locator("li").filter({
      has: page.getByText("Glow Nail Studio"),
    }).first();
    await expect(glowAppointment).toBeVisible();
    await expect(glowAppointment.getByText("Gel manicure")).toBeVisible();
    expect(publicBookingNavigations).not.toContain("/onboarding");
    expect(publicBookingNavigations.some((path) => path.startsWith("/dashboard"))).toBe(
      false,
    );

    expect(
      await latestAppointmentCustomerId({
        userId: customerId,
        organizationSlug: GLOW_ORG_SLUG,
        customerName: "Member Cross-Salon Customer",
      }),
    ).toBe(customerId);
  });
});
