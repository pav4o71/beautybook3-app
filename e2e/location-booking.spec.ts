import { expect, test } from "@playwright/test";
import { DEMO_ACCOUNT } from "../lib/demo-account";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(DEMO_ACCOUNT.email);
  await page.locator('input[name="password"]').fill(DEMO_ACCOUNT.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/dashboard");
}

test.describe("location booking", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("nav location switcher and booking picker filter staff by branch", async ({
    page,
  }) => {
    await expect(page.locator("#locationId")).toBeVisible();

    await page.goto("/dashboard/book");
    await expect(page.getByRole("heading", { name: "Book" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Main location" })).toBeVisible();
    await expect(page.getByText("Maya Petrova")).toBeVisible();

    await page.getByRole("button", { name: "BGC branch" }).click();
    await page.waitForURL(/locationId=/);
    await page.getByRole("button", { name: "Haircut" }).click();
    await page.waitForURL(/serviceId=/);
    await expect(page.getByText("Jordan Reyes")).toBeVisible();
    await expect(page.getByText("Maya Petrova")).toHaveCount(0);

    await page.getByRole("button", { name: "Main location" }).click();
    await page.waitForURL(/locationId=/);
    await page.getByRole("button", { name: "Haircut" }).click();
    await expect(page.getByText("Maya Petrova")).toBeVisible();
  });
});
