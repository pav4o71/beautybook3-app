import { expect, test } from "@playwright/test";
import {
  DEMO_ORG_SLUG,
  GLOW_ORG_SLUG,
  LUXE_ORG_SLUG,
} from "../lib/demo-constants";

function nextManilaWeekdayIso() {
  const now = new Date();
  for (let offset = 1; offset <= 8; offset += 1) {
    const candidate = new Date(now.getTime() + offset * 86_400_000);
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      weekday: "short",
    }).format(candidate);
    if (weekday === "Sat" || weekday === "Sun") continue;
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(candidate);
  }
  throw new Error("Could not find a Manila weekday");
}

test.describe("search marketplace", () => {
  test("duplicate category query params use the first value", async ({ page }) => {
    await page.goto("/?category=hair&category=nails");

    await expect(page.getByRole("heading", { name: "Find a salon" })).toBeVisible();
    await expect(page.getByTestId("category-hair")).toHaveClass(/bg-zinc-900/);
    await expect(page.getByTestId(`business-${DEMO_ORG_SLUG}`)).toBeVisible();
    await expect(page.getByTestId(`business-${LUXE_ORG_SLUG}`)).toBeVisible();
    await expect(page.getByTestId(`business-${GLOW_ORG_SLUG}`)).toHaveCount(0);
  });

  test("landing category search lists hair salons from multiple businesses", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("category-hair").click();
    await page.waitForURL("/?category=hair");

    await expect(page.getByRole("heading", { name: "Find a salon" })).toBeVisible();
    await expect(page.getByTestId("category-hair")).toHaveClass(/bg-zinc-900/);
    await expect(page.getByTestId("service-chip-haircut")).toBeVisible();

    await expect(page.getByTestId(`business-${DEMO_ORG_SLUG}`)).toBeVisible();
    await expect(page.getByTestId(`business-${LUXE_ORG_SLUG}`)).toBeVisible();
    await expect(page.getByTestId(`business-${GLOW_ORG_SLUG}`)).toHaveCount(0);
    await expect(page.getByTestId(`business-cover-${DEMO_ORG_SLUG}`)).toHaveAttribute(
      "src",
      /\/images\/salons\/beautybook-demo\.jpg$/,
    );
    await expect(page.getByTestId(`business-cover-${DEMO_ORG_SLUG}`)).toHaveAttribute(
      "alt",
      "BeautyBook Demo Salon cover",
    );
    await expect(page.getByText("₱350.00").first()).toBeVisible();
    await expect(page.getByText("Haircut").first()).toBeVisible();

    await page.getByTestId("service-chip-blowout").click();
    await page.waitForURL("/?category=hair&service=Blowout");
    await expect(page.getByTestId(`business-${LUXE_ORG_SLUG}`)).toBeVisible();
    await expect(page.getByTestId(`business-${DEMO_ORG_SLUG}`)).toHaveCount(0);
  });

  test("area filter keeps only branches in that Manila area", async ({ page }) => {
    await page.goto("/?category=hair");
    await page.getByTestId("area-filter").selectOption("Makati");
    await page.waitForURL("/?category=hair&area=Makati");

    await expect(page.getByTestId(`business-${DEMO_ORG_SLUG}`)).toBeVisible();
    await expect(
      page.getByTestId(`business-${DEMO_ORG_SLUG}`).getByText("Manila · Makati"),
    ).toBeVisible();
    await expect(page.getByTestId(`business-${LUXE_ORG_SLUG}`)).toHaveCount(0);
    await expect(page.getByTestId(`business-${GLOW_ORG_SLUG}`)).toHaveCount(0);
  });

  test("nails category and marketplace redirect preserve discovery", async ({
    page,
  }) => {
    await page.goto("/marketplace");
    await page.waitForURL("/");
    await expect(page.getByRole("heading", { name: "Find a salon" })).toBeVisible();

    await page.getByTestId("category-nails").click();
    await page.waitForURL("/?category=nails");
    await expect(page.getByTestId(`business-${GLOW_ORG_SLUG}`)).toBeVisible();
    await expect(page.getByTestId(`business-${DEMO_ORG_SLUG}`)).toBeVisible();
    await expect(page.getByTestId(`business-${LUXE_ORG_SLUG}`)).toHaveCount(0);

    await page.getByTestId("category-all").click();
    await page.waitForURL("/");
    await expect(page.getByTestId(`business-${LUXE_ORG_SLUG}`)).toBeVisible();
    await expect(page.getByTestId(`business-${GLOW_ORG_SLUG}`)).toBeVisible();

    await page.getByTestId(`book-now-${DEMO_ORG_SLUG}`).click();
    await page.waitForURL(new RegExp(`/s/${DEMO_ORG_SLUG}(?:\\?|$)`));
    await expect(page.getByRole("heading", { name: "BeautyBook Demo Salon" })).toBeVisible();
    await expect(page.getByText("Haircut").first()).toBeVisible();

    await page.goto("/?category=nails");
    await page
      .getByTestId(`business-${GLOW_ORG_SLUG}`)
      .getByRole("link", { name: "View salon" })
      .click();
    await page.waitForURL(`/s/${GLOW_ORG_SLUG}`);
    await expect(page.getByText("QC Studio")).toBeVisible();

    await page.goto(`/s/${LUXE_ORG_SLUG}`);
    await expect(page.getByText("Ortigas Center, Pasig")).toBeVisible();
  });

  test("marketplace redirect preserves filters and availability mode", async ({
    page,
  }) => {
    const date = nextManilaWeekdayIso();
    await page.goto(
      `/marketplace?category=hair&service=Haircut&area=Makati&date=${date}&time=10:00`,
    );
    await page.waitForURL((url) => {
      const parsed = new URL(url);
      return (
        parsed.pathname === "/" &&
        parsed.searchParams.get("category") === "hair" &&
        parsed.searchParams.get("service") === "Haircut" &&
        parsed.searchParams.get("area") === "Makati" &&
        parsed.searchParams.get("date") === date &&
        parsed.searchParams.get("time") === "10:00"
      );
    });

    await expect(page.getByRole("heading", { name: "Find a salon" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Available times" })).toBeVisible();
    await expect(page.getByTestId("date-picker")).toHaveValue(date);
    await expect(page.getByTestId("time-filter")).toHaveValue("10:00");
    await expect(page.getByTestId("area-filter")).toHaveValue("Makati");
    await expect(page.getByTestId("category-hair")).toHaveClass(/bg-zinc-900/);
  });
});
