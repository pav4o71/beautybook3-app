import { expect, test } from "@playwright/test";
import { DEMO_ORG_SLUG } from "../lib/demo-constants";

test.describe("transactional lifecycle emails flow", () => {
  test("cancellation flow completes and updates receipt state safely", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.goto(`/s/${DEMO_ORG_SLUG}/book`);

    await page.getByRole("button", { name: /Haircut/i }).click();
    await page.getByRole("button", { name: /Maya Petrova/i }).click();
    await page.waitForLoadState("networkidle");

    const email = `cancel-flow-${Date.now()}@example.com`;
    await page.getByTestId("customer-name-input").fill("Cancel Flow Customer");
    await page.getByTestId("customer-phone-input").fill("0917 444 8899");
    await page.getByTestId("customer-email-input").fill(email);

    const slot = page.getByTestId("book-slot").last();
    await expect(slot).toBeVisible({ timeout: 15_000 });

    await Promise.all([
      page.waitForURL(new RegExp(`/b/([A-Za-z0-9_-]{43})\\?booked=1`), { timeout: 45_000 }),
      slot.click(),
    ]);

    const currentUrl = page.url();
    const tokenMatch = currentUrl.match(/\/b\/([A-Za-z0-9_-]{43})\?booked=1/);
    expect(tokenMatch).not.toBeNull();
    const rawToken = tokenMatch![1];

    // Open cancel dialog
    const cancelBtn = page.getByTestId("cancel-appointment-button");
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();

    await page.getByTestId("cancel-reason-select").selectOption("schedule_conflict");
    await page.getByTestId("confirm-cancel-button").click();

    // Verify cancellation notice appears
    const notice = page.getByTestId("cancellation-notice");
    await expect(notice).toBeVisible({ timeout: 15_000 });
    await expect(notice).toContainText("Appointment cancelled");
    await expect(notice).toContainText("Schedule conflict");

    // Security: raw token not in visible text
    await expect(page.locator("main").getByText(rawToken)).toHaveCount(0);
  });

  test("reschedule flow completes and updates receipt state safely", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.goto(`/s/${DEMO_ORG_SLUG}/book`);

    await page.getByRole("button", { name: /Haircut/i }).click();
    await page.getByRole("button", { name: /Maya Petrova/i }).click();
    await page.waitForLoadState("networkidle");

    const email = `resched-flow-${Date.now()}@example.com`;
    await page.getByTestId("customer-name-input").fill("Resched Flow Customer");
    await page.getByTestId("customer-phone-input").fill("0917 333 7788");
    await page.getByTestId("customer-email-input").fill(email);

    const slot = page.getByTestId("book-slot").last();
    await expect(slot).toBeVisible({ timeout: 15_000 });

    await Promise.all([
      page.waitForURL(new RegExp(`/b/([A-Za-z0-9_-]{43})\\?booked=1`), { timeout: 45_000 }),
      slot.click(),
    ]);

    const currentUrl = page.url();
    const tokenMatch = currentUrl.match(/\/b\/([A-Za-z0-9_-]{43})\?booked=1/);
    expect(tokenMatch).not.toBeNull();
    const rawToken = tokenMatch![1];

    // Open reschedule dialog
    const rescheduleBtn = page.getByTestId("reschedule-appointment-button");
    await expect(rescheduleBtn).toBeVisible();
    await rescheduleBtn.click();

    const availableSlots = page.getByTestId("reschedule-slot");
    await expect(availableSlots.first()).toBeVisible({ timeout: 10_000 });
    await availableSlots.last().click();

    const confirmBtn = page.getByTestId("confirm-reschedule-button");
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // Verify rescheduled banner
    await expect(page.getByTestId("reschedule-success-state")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Appointment rescheduled!" })).toBeVisible();

    // Security: raw token not in visible text
    await expect(page.locator("main").getByText(rawToken)).toHaveCount(0);
  });
});
