import { expect, test } from "@playwright/test";
import {
  DEMO_ORG_SLUG,
  GLOW_ORG_SLUG,
  LUXE_ORG_SLUG,
} from "../lib/demo-constants";

test.describe("marketplace", () => {
  test("lists published salons with locations and opens public book page", async ({
    page,
  }) => {
    await page.goto("/marketplace");
    await expect(page.getByRole("heading", { name: "Marketplace" })).toBeVisible();

    await expect(page.getByText("BeautyBook Demo Salon")).toBeVisible();
    await expect(page.getByText("Glow Nail Studio")).toBeVisible();
    await expect(page.getByText("Luxe Hair Lounge")).toBeVisible();

    await expect(page.getByText("Main location")).toBeVisible();
    await expect(page.getByText("BGC branch")).toBeVisible();
    await expect(page.getByText("Makati Studio")).toBeVisible();
    await expect(page.getByText("Ortigas branch")).toBeVisible();

    await page
      .locator("li")
      .filter({ hasText: "BeautyBook Demo Salon" })
      .getByRole("link", { name: "Book now" })
      .click();
    await page.waitForURL(`/s/${DEMO_ORG_SLUG}/book`);
    await expect(page.getByRole("heading", { name: "Book online" })).toBeVisible();
    await expect(page.getByText(/Pay at the salon/i).first()).toBeVisible();

    await page.goto("/marketplace");
    await page
      .locator("li")
      .filter({ hasText: "Glow Nail Studio" })
      .getByRole("link", { name: "View salon" })
      .click();
    await page.waitForURL(`/s/${GLOW_ORG_SLUG}`);
    await expect(page.getByText("QC Studio")).toBeVisible();

    await page.goto(`/s/${LUXE_ORG_SLUG}`);
    await expect(page.getByText("Ortigas Center, Pasig")).toBeVisible();
  });
});
