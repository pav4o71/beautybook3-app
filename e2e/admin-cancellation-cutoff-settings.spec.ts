import { expect, test } from "@playwright/test";
import { DEMO_ACCOUNT } from "../lib/demo-account";
import { DEMO_ORG_SLUG } from "../lib/demo-constants";

async function signInAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(DEMO_ACCOUNT.email);
  await page.locator('input[name="password"]').fill(DEMO_ACCOUNT.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/dashboard");
}

test.describe("organization cancellation cutoff settings", () => {
  test("admin updates cancellation cutoff hours, and customer receipt enforces dynamic cutoff", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    // 1. Sign in as admin
    await signInAdmin(page);

    // 2. Go to business settings
    await page.goto("/dashboard/admin/settings");
    await expect(page.getByRole("heading", { name: "Business settings" })).toBeVisible();

    const cutoffInput = page.getByTestId("cancellation-cutoff-hours-input");
    await expect(cutoffInput).toBeVisible();
    await expect(cutoffInput).toHaveValue("24");

    // 3. Test invalid cutoff bounds (< 0 or > 168)
    await cutoffInput.fill("-1");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(
      page.getByText(/Cutoff must be between 0 and 168 hours/i),
    ).toBeVisible();

    await cutoffInput.fill("200");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(
      page.getByText(/Cutoff must be between 0 and 168 hours/i),
    ).toBeVisible();

    // 4. Update cutoff to 0 hours and verify persistence
    await cutoffInput.fill("0");
    await page.getByRole("button", { name: "Save settings" }).click();
    await page.waitForURL(/\/dashboard\/admin\/settings\?saved=1/);
    await expect(page.getByText("Settings saved.")).toBeVisible();
    await expect(cutoffInput).toHaveValue("0");

    await page.reload();
    await expect(cutoffInput).toHaveValue("0");

    // 5. Clear cookies to simulate unauthenticated guest customer
    await page.context().clearCookies();

    // Open public booking page as guest and book a future slot
    await page.goto(`/s/${DEMO_ORG_SLUG}/book`);
    await page.getByRole("button", { name: /Haircut/i }).click();
    await page.getByRole("button", { name: /Maya Petrova/i }).click();
    await page.waitForLoadState("networkidle");

    await page.getByTestId("customer-name-input").fill("Zero Cutoff Guest");
    await page.getByTestId("customer-phone-input").fill("0917 555 0000");

    const zeroSlot = page.getByTestId("book-slot").first();
    await expect(zeroSlot).toBeVisible({ timeout: 15_000 });

    await Promise.all([
      page.waitForURL(new RegExp(`/b/([A-Za-z0-9_-]{43})\\?booked=1`), { timeout: 45_000 }),
      zeroSlot.click(),
    ]);

    // Under 0h cutoff, future appointment has cancel and reschedule buttons visible!
    await expect(page.getByText("You can cancel or reschedule until the appointment starts.")).toBeVisible();
    await expect(page.getByTestId("cancel-appointment-button")).toBeVisible();
    await expect(page.getByTestId("reschedule-appointment-button")).toBeVisible();
    await expect(page.getByTestId("cancellation-cutoff-notice")).toHaveCount(0);

    // 6. Sign back in and update cutoff to 168 hours to verify dynamic restriction
    await signInAdmin(page);
    await page.goto("/dashboard/admin/settings");
    await expect(page.getByTestId("cancellation-cutoff-hours-input")).toBeVisible();
    await page.getByTestId("cancellation-cutoff-hours-input").fill("168");
    await page.getByRole("button", { name: "Save settings" }).click();
    await page.waitForURL(/\/dashboard\/admin\/settings\?saved=1/);
    await expect(page.getByText("Settings saved.")).toBeVisible();

    // 7. Re-check the previously booked appointment under 168h cutoff
    // It is < 168 hours away, so online changes must now be blocked
    await page.context().clearCookies();
    await page.goto(`/s/${DEMO_ORG_SLUG}/book`);
    await page.getByRole("button", { name: /Haircut/i }).click();
    await page.getByRole("button", { name: /Maya Petrova/i }).click();
    await page.waitForLoadState("networkidle");

    await page.getByTestId("customer-name-input").fill("Cutoff E2E Guest 168h");
    await page.getByTestId("customer-phone-input").fill("0917 555 4444");

    const slot48 = page.getByTestId("book-slot").first();
    await expect(slot48).toBeVisible({ timeout: 15_000 });

    await Promise.all([
      page.waitForURL(new RegExp(`/b/([A-Za-z0-9_-]{43})\\?booked=1`), { timeout: 45_000 }),
      slot48.click(),
    ]);

    const cutoffNotice = page.getByTestId("cancellation-cutoff-notice");
    await expect(cutoffNotice).toBeVisible();
    await expect(cutoffNotice).toContainText("168 hours");
    await expect(page.getByTestId("cancel-appointment-button")).toHaveCount(0);
    await expect(page.getByTestId("reschedule-appointment-button")).toHaveCount(0);

    // 8. Restore cutoff back to default 24 hours
    await signInAdmin(page);
    await page.goto("/dashboard/admin/settings");
    await expect(page.getByTestId("cancellation-cutoff-hours-input")).toBeVisible();
    await page.getByTestId("cancellation-cutoff-hours-input").fill("24");
    await page.getByRole("button", { name: "Save settings" }).click();
    await page.waitForURL(/\/dashboard\/admin\/settings\?saved=1/);
    await expect(page.getByText("Settings saved.")).toBeVisible();
    await expect(page.getByTestId("cancellation-cutoff-hours-input")).toHaveValue("24");
  });
});
