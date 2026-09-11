import { expect, test } from "@playwright/test";
import { DEMO_ACCOUNT } from "../lib/demo-account";

async function signInAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(DEMO_ACCOUNT.email);
  await page.locator('input[name="password"]').fill(DEMO_ACCOUNT.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/dashboard");
}

function appointmentRow(page: import("@playwright/test").Page, label: string | RegExp) {
  return page.locator('[data-testid^="admin-appointment-"]').filter({ hasText: label });
}

async function appointmentIdFromRow(row: import("@playwright/test").Locator) {
  const testId = await row.getAttribute("data-testid");
  if (!testId?.startsWith("admin-appointment-")) {
    throw new Error("Expected admin appointment row test id");
  }
  return testId.slice("admin-appointment-".length);
}

test.describe("admin appointments board", () => {
  test.beforeEach(async ({ page }) => {
    await signInAdmin(page);
  });

  test("lists today's board and marks gel manicure completed", async ({ page }) => {
    await page.goto("/dashboard/admin/appointments");

    await expect(page.getByRole("heading", { name: /Today's appointments/i })).toBeVisible();
    await expect(
      page.getByRole("main").locator("nav").getByText("Appointments", { exact: true }),
    ).toBeVisible();

    const row = appointmentRow(page, /Gel manicure/i).filter({ hasText: "Lena Dimitrova" });
    await expect(row).toBeVisible();
    await expect(row.getByText("Confirmed", { exact: true })).toBeVisible();

    const appointmentId = await appointmentIdFromRow(row);

    await Promise.all([
      page.waitForURL("/dashboard/admin/appointments"),
      page.getByTestId(`appointment-complete-${appointmentId}`).click(),
    ]);

    await expect(row.getByText("Completed", { exact: true })).toBeVisible();
    await expect(page.getByTestId(`appointment-complete-${appointmentId}`)).toHaveCount(0);
  });

  test("marks Lena haircut no-show", async ({ page }) => {
    await page.goto("/dashboard/admin/appointments");

    const row = appointmentRow(page, /Haircut/i).filter({ hasText: "Lena Dimitrova" });
    await expect(row.getByText("Confirmed", { exact: true })).toBeVisible();

    const appointmentId = await appointmentIdFromRow(row);

    await Promise.all([
      page.waitForURL("/dashboard/admin/appointments"),
      page.getByTestId(`appointment-no-show-${appointmentId}`).click(),
    ]);

    await expect(row.getByText("No show", { exact: true })).toBeVisible();
  });

  test("marks Maya haircut cancelled", async ({ page }) => {
    await page.goto("/dashboard/admin/appointments");

    const row = appointmentRow(page, /Haircut/i).filter({ hasText: "Maya Petrova" });
    await expect(row.getByText("Confirmed", { exact: true })).toBeVisible();

    const appointmentId = await appointmentIdFromRow(row);

    await Promise.all([
      page.waitForURL("/dashboard/admin/appointments"),
      page.getByTestId(`appointment-cancel-${appointmentId}`).click(),
    ]);

    await expect(row.getByText("Cancelled", { exact: true })).toBeVisible();
  });

  test("navigates days with prev, next, and today controls", async ({ page }) => {
    await page.goto("/dashboard/admin/appointments");

    await expect(page.getByTestId("staff-day-board")).toBeVisible();
    await expect(page.getByTestId("prev-day-button")).toBeVisible();
    await expect(page.getByTestId("next-day-button")).toBeVisible();

    // Click Prev Day
    await page.getByTestId("prev-day-button").click();
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("date=");
    await expect(page.getByTestId("today-button")).toBeVisible();

    // Click Next Day (back to today)
    await page.getByTestId("next-day-button").click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: /Today's appointments/i })).toBeVisible();
  });

  test("creates a walk-in appointment via reception dialog", async ({ page }) => {
    test.setTimeout(60_000);
    // Use an explicit working Monday date to prevent weekend schedule gaps from breaking walk-in creation
    await page.goto("/dashboard/admin/appointments?date=2026-09-14");

    const walkInBtn = page.getByTestId("walk-in-button");
    await expect(walkInBtn).toBeVisible();
    await walkInBtn.click();

    await expect(page.getByRole("heading", { name: "New Walk-In Appointment" })).toBeVisible();

    const uniqueCustomer = `Walk-in Guest ${Date.now()}`;
    await page.getByTestId("walk-in-name").fill(uniqueCustomer);
    await page.getByTestId("walk-in-phone").fill("0917 888 7777");

    // Select specialist
    await page.getByTestId("walk-in-staff").selectOption({ index: 1 });

    // Set working date and time
    await page.getByTestId("walk-in-date").fill("2026-09-14");
    await page.getByTestId("walk-in-time").fill("10:00");

    await page.getByTestId("walk-in-submit").click();

    // Dialog should close and appointment should appear in specialist lane
    await expect(page.getByRole("heading", { name: "New Walk-In Appointment" })).toHaveCount(0);
    await expect(page.getByText(uniqueCustomer)).toBeVisible({ timeout: 15_000 });
  });

  test("renders true 30-minute timeline geometry with time gutter and duration-scaled cards", async ({ page }) => {
    await page.goto("/dashboard/admin/appointments");

    // 1. Time gutter exists with 30-minute markers
    const timeGutter = page.getByTestId("timeline-time-gutter");
    await expect(timeGutter).toBeVisible();
    await expect(page.getByTestId("time-marker-09:00")).toBeVisible();
    await expect(page.getByTestId("time-marker-09:30")).toBeVisible();
    await expect(page.getByTestId("time-marker-10:00")).toBeVisible();

    // 2. Staff lanes exist with appointment cards
    const lanes = page.locator('[data-testid^="staff-lane-"]');
    await expect(lanes.first()).toBeVisible();
    expect(await lanes.count()).toBeGreaterThan(0);

    // 3. Appointment cards have explicit temporal top and height styling
    const cards = page.locator('[data-testid^="admin-appointment-"]');
    const firstCard = cards.first();
    await expect(firstCard).toBeVisible();

    const styleAttr = await firstCard.getAttribute("style");
    expect(styleAttr).toContain("top:");
    expect(styleAttr).toContain("height:");
  });

  test("unauthenticated user is sent to login", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/dashboard/admin/appointments");
    await page.waitForURL("/login");
  });
});
