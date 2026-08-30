import { expect, test } from "@playwright/test";
import { DEMO_ACCOUNT } from "../lib/demo-account";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(DEMO_ACCOUNT.email);
  await page.locator('input[name="password"]').fill(DEMO_ACCOUNT.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/dashboard");
}

test.describe("locations admin", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("lists default location and creates a new branch", async ({ page }) => {
    const suffix = Date.now();
    const branchName = `E2E Branch ${suffix}`;
    const branchAddress = `123 Test Street ${suffix}, Makati`;

    await page.goto("/dashboard/admin/locations");
    await expect(page.getByRole("heading", { name: "Locations" })).toBeVisible();
    const mainLocationRow = page.getByRole("listitem").filter({ hasText: "Main location" });
    await expect(mainLocationRow).toBeVisible();
    await expect(mainLocationRow.getByText("Default", { exact: true })).toBeVisible();

    await page.locator('input[name="name"]').fill(branchName);
    await page.locator('input[name="address"]').fill(branchAddress);
    await page.locator('select[name="area"]').selectOption("Quezon City");
    await page.getByRole("button", { name: "Create location" }).click();

    await page.waitForURL("/dashboard/admin/locations");
    const row = page.locator("li").filter({ hasText: branchName });
    await expect(row).toBeVisible();
    await expect(row.getByText(branchAddress)).toBeVisible();
    await expect(row.getByText("Quezon City")).toBeVisible();
  });

  test("admin can reassign staff to another location", async ({ page }) => {
    await page.goto("/dashboard/admin/staff");
    const jordanRow = page.locator("li").filter({ hasText: "Jordan Reyes" });

    await jordanRow.getByRole("link", { name: "Edit" }).click();
    await page.waitForURL(/\/dashboard\/admin\/staff\/.+/);
    const locationSelect = page.locator("main select[name='locationId']");
    await locationSelect.selectOption({ label: "Main location (default)" });
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.waitForURL("/dashboard/admin/staff");

    await page.goto("/dashboard/book");
    await page.getByRole("button", { name: "BGC branch" }).click();
    await page.waitForURL(/locationId=/);
    await page.getByRole("button", { name: "Haircut" }).click();
    await expect(page.getByText("Jordan Reyes")).toHaveCount(0);

    await page.goto("/dashboard/admin/staff");
    const jordanRowAfterBook = page.locator("li").filter({ hasText: "Jordan Reyes" });
    await jordanRowAfterBook.getByRole("link", { name: "Edit" }).click();
    await page.waitForURL(/\/dashboard\/admin\/staff\/.+/);
    await page.locator("main select[name='locationId']").selectOption({ label: "BGC branch" });
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.waitForURL("/dashboard/admin/staff");
  });
});
