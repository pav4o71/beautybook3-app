import { expect, test } from "@playwright/test";
import { DEMO_ORG_SLUG } from "../lib/demo-constants";

test.describe("salon storefront", () => {
  test("lists Haircut and books two services in one slot", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/s/${DEMO_ORG_SLUG}`);

    await expect(page.getByRole("heading", { name: "BeautyBook Demo Salon" })).toBeVisible();
    await expect(page.getByText("Haircut").first()).toBeVisible();
    await expect(page.getByText("Makati salon for cuts").first()).toBeVisible();
    await expect(page.getByText(/E2E Branch/)).toHaveCount(0);

    await page.getByTestId("service-checkbox-Haircut").check();
    await page.getByTestId("service-checkbox-Gel manicure").check();
    await page.getByTestId("continue-booking").click();
    await page.waitForURL(new RegExp(`/s/${DEMO_ORG_SLUG}/book\\?`));
    await expect(page).toHaveURL(/serviceIds=/);
    await expect(page).toHaveURL(/locationId=/);

    await expect(page.getByRole("heading", { name: "Book online" })).toBeVisible();
    await expect(page.getByText(/Total at salon/)).toContainText("₱800.00");
    await expect(page.getByRole("button", { name: /Haircut/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Gel manicure/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Lena Dimitrova/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /BGC branch/i })).toBeDisabled();

    const slot = page.getByTestId("book-slot").first();
    await expect(slot).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("customer-name-input").fill("Storefront Guest");
    await page.getByTestId("customer-phone-input").fill("0917 123 4567");

    await Promise.all([
      page.waitForURL(new RegExp(`/b/.*\\?booked=1`), { timeout: 45_000 }),
      slot.click(),
    ]);

    await expect(page.getByText(/Booked! Pay at the salon/i)).toBeVisible();
    await expect(page.getByTestId("booking-success-state")).toBeVisible();
    await expect(page.getByRole("link", { name: "View salon" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Book another appointment" })).toBeVisible();
    await expect(page.getByTestId("book-slot")).toHaveCount(0);

    // Verify reload maintains success confirmation without triggering a duplicate booking or exposing slots
    await page.reload();
    await expect(page.getByTestId("booking-success-state")).toBeVisible();
    await expect(page.getByTestId("book-slot")).toHaveCount(0);

    // Verify "Book another appointment" navigates back to clean booking form without booked param
    await page.getByRole("link", { name: "Book another appointment" }).click();
    await page.waitForURL(new RegExp(`/s/${DEMO_ORG_SLUG}/book$`));
    await expect(page.getByRole("heading", { name: "Book online" })).toBeVisible();
    await expect(page.getByTestId("booking-success-state")).toHaveCount(0);
  });

  test("shows clear specialist empty-state copy when no service is selected", async ({ page }) => {
    await page.goto(`/s/${DEMO_ORG_SLUG}/book`);
    await expect(
      page.getByText("Choose a service to see available specialists."),
    ).toBeVisible();
  });

  test("homepage Book now deep-links into booking with the service", async ({ page }) => {
    await page.goto("/?service=Haircut");
    await page.getByTestId(`book-now-${DEMO_ORG_SLUG}`).click();
    await page.waitForURL(new RegExp(`/s/${DEMO_ORG_SLUG}/book\\?`));
    await expect(page).toHaveURL(/serviceId=/);
    await expect(page.getByRole("heading", { name: "Book online" })).toBeVisible();
  });

  test("homepage View salon keeps the service name on the salon page", async ({ page }) => {
    await page.goto("/?service=Haircut");
    await page
      .getByTestId(`business-${DEMO_ORG_SLUG}`)
      .getByRole("link", { name: "View salon" })
      .click();
    await page.waitForURL(`/s/${DEMO_ORG_SLUG}?service=Haircut`);
    await expect(page.getByTestId("service-checkbox-Haircut")).toBeChecked();
    await expect(page.getByTestId("salon-book-cta")).toBeVisible();
  });
});
