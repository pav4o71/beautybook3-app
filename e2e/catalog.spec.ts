import { expect, test } from "@playwright/test";
import { DEMO_ACCOUNT } from "../lib/demo-account";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(DEMO_ACCOUNT.email);
  await page.locator('input[name="password"]').fill(DEMO_ACCOUNT.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/dashboard");
}

test.describe("catalog", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("services page shows PHP prices", async ({ page }) => {
    await page.goto("/dashboard/services");
    await expect(page.getByText("₱350.00").first()).toBeVisible();
    await expect(page.getByText("Haircut")).toBeVisible();
  });

  test("admin services are grouped by category", async ({ page }) => {
    await page.goto("/dashboard/admin/services");
    await expect(page.getByRole("heading", { name: "Hair" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Nails" })).toBeVisible();
    await expect(page.getByText("₱350.00").first()).toBeVisible();
  });

  test("admin staff shows schedule summary", async ({ page }) => {
    await page.goto("/dashboard/admin/staff");
    await expect(page.getByText(/Hours:/).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Schedule" }).first()).toBeVisible();
  });
});
