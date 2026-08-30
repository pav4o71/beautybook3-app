import { expect, test } from "@playwright/test";
import { DEMO_ORG_SLUG } from "../lib/demo-constants";

test.describe("marketplace", () => {
  test("lists demo salon and opens public book page", async ({ page }) => {
    await page.goto("/marketplace");
    await expect(page.getByRole("heading", { name: "Marketplace" })).toBeVisible();
    await expect(page.getByText("BeautyBook Demo Salon")).toBeVisible();

    await page.getByRole("link", { name: "Book now" }).first().click();
    await page.waitForURL(`/s/${DEMO_ORG_SLUG}/book`);
    await expect(page.getByRole("heading", { name: "Book online" })).toBeVisible();
    await expect(page.getByText(/Pay at the salon/i).first()).toBeVisible();
  });
});
