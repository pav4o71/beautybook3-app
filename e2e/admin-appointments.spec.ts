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

  test("unauthenticated user is sent to login", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/dashboard/admin/appointments");
    await page.waitForURL("/login");
  });
});
