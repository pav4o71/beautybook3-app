import { expect, test } from "@playwright/test";
import {
  DEMO_ORG_SLUG,
  GLOW_ORG_SLUG,
  LUXE_ORG_SLUG,
} from "../lib/demo-constants";

test.describe("search marketplace", () => {
  test("landing category search lists hair services from multiple salons", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("category-hair").click();
    await page.waitForURL("/search?category=hair");

    await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();
    await expect(page.getByTestId("category-hair")).toHaveClass(/bg-zinc-900/);

    await expect(page.getByText("BeautyBook Demo Salon").first()).toBeVisible();
    await expect(page.getByText("Luxe Hair Lounge").first()).toBeVisible();
    await expect(page.getByText("Glow Nail Studio")).toHaveCount(0);
    await expect(page.getByText("₱350.00").first()).toBeVisible();
    await expect(page.getByText("Haircut").first()).toBeVisible();
  });

  test("area filter keeps only branches in that Manila area", async ({ page }) => {
    await page.goto("/search?category=hair");
    await page.getByTestId("area-filter").selectOption("Makati");
    await page.waitForURL("/search?category=hair&area=Makati");

    await expect(page.getByText("BeautyBook Demo Salon").first()).toBeVisible();
    await expect(
      page.locator("[data-testid^='service-result-']").filter({ hasText: "Makati" }).first(),
    ).toBeVisible();
    await expect(page.getByText("Luxe Hair Lounge")).toHaveCount(0);
    await expect(page.getByText("Glow Nail Studio")).toHaveCount(0);
  });

  test("nails category and marketplace redirect preserve discovery", async ({
    page,
  }) => {
    await page.goto("/marketplace");
    await page.waitForURL("/search");
    await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();

    await page.getByTestId("category-nails").click();
    await page.waitForURL("/search?category=nails");
    await expect(page.getByText("Glow Nail Studio").first()).toBeVisible();
    await expect(page.getByText("BeautyBook Demo Salon").first()).toBeVisible();
    await expect(page.getByText("Luxe Hair Lounge")).toHaveCount(0);

    await page.getByTestId("category-all").click();
    await page.waitForURL("/search");
    await expect(page.getByText("Luxe Hair Lounge").first()).toBeVisible();
    await expect(page.getByText("Glow Nail Studio").first()).toBeVisible();

    await page
      .locator("[data-testid^='service-result-']")
      .filter({ hasText: "BeautyBook Demo Salon" })
      .filter({ hasText: "Haircut" })
      .getByRole("link", { name: "Book" })
      .click();
    await page.waitForURL(new RegExp(`/s/${DEMO_ORG_SLUG}/book`));
    await expect(page.getByRole("heading", { name: "Book online" })).toBeVisible();

    await page.goto("/search?category=nails");
    await page
      .locator("[data-testid^='service-result-']")
      .filter({ hasText: "Glow Nail Studio" })
      .first()
      .getByRole("link", { name: "View salon" })
      .click();
    await page.waitForURL(`/s/${GLOW_ORG_SLUG}`);
    await expect(page.getByText("QC Studio")).toBeVisible();

    await page.goto(`/s/${LUXE_ORG_SLUG}`);
    await expect(page.getByText("Ortigas Center, Pasig")).toBeVisible();
  });
});
