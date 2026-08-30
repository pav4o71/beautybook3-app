import { expect, test } from "@playwright/test";
import { DEMO_ACCOUNT, DEMO_CUSTOMER } from "../lib/demo-account";

async function signIn(
  page: import("@playwright/test").Page,
  account: { email: string; password: string },
) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(account.email);
  await page.locator('input[name="password"]').fill(account.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/dashboard");
}

test.describe("booking as admin", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, DEMO_ACCOUNT);
  });

  test("shows pay at salon messaging", async ({ page }) => {
    await page.goto("/dashboard/book");
    await expect(page.getByText(/Pay at the salon/i).first()).toBeVisible();
    await expect(page.getByText("₱350.00").first()).toBeVisible();
  });

  test("books a slot and lands on appointments", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/dashboard/book");

    await page.getByRole("button", { name: /Gel manicure/i }).click();
    await page.getByRole("button", { name: /Lena Dimitrova/i }).click();
    await page.waitForLoadState("networkidle");

    const slot = page.getByTestId("book-slot").first();
    await expect(slot).toBeVisible({ timeout: 15_000 });

    await Promise.all([
      page.waitForURL(/\/dashboard\/appointments\?booked=1/, { timeout: 45_000 }),
      slot.click(),
    ]);

    await expect(page.getByText(/Pay at the salon/i).first()).toBeVisible();
    await expect(page.getByText("Confirmed").first()).toBeVisible();
  });
});

test.describe("booking as customer", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, DEMO_CUSTOMER);
  });

  test("lists seeded appointments with status-specific pay copy", async ({ page }) => {
    await page.goto("/dashboard/appointments");

    const confirmed = page.locator("article").filter({
      has: page.getByText("Confirmed", { exact: true }),
    });
    await expect(confirmed.first().getByText(/Pay at salon/i)).toBeVisible();

    const completed = page.locator("article").filter({
      has: page.getByText("Completed", { exact: true }),
    });
    await expect(completed.getByText(/Paid at salon/i)).toBeVisible();
    await expect(completed.getByText(/^Pay at salon:/i)).toHaveCount(0);
  });

  test("customer books a slot", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/dashboard/book");

    await page.getByRole("button", { name: /Haircut/i }).click();
    await page.getByRole("button", { name: /Maya Petrova/i }).click();
    await page.waitForLoadState("networkidle");

    const slot = page.getByTestId("book-slot").first();
    await expect(slot).toBeVisible({ timeout: 15_000 });

    await Promise.all([
      page.waitForURL(/\/dashboard\/appointments\?booked=1/, { timeout: 45_000 }),
      slot.click(),
    ]);

    await expect(page.getByText(/Booked! Pay at the salon/i)).toBeVisible();
    await expect(page.getByText("Confirmed").first()).toBeVisible();
  });
});
