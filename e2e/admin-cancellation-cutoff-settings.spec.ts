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

    // 3. Test invalid cutoff bounds (< 1 or > 168)
    await cutoffInput.fill("200");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(
      page.getByText(/Cutoff must be between 1 and 168 hours/i),
    ).toBeVisible();

    // 4. Update cutoff to 48 hours
    await cutoffInput.fill("48");
    await page.getByRole("button", { name: "Save settings" }).click();

    await page.waitForURL(/\/dashboard\/admin\/settings\?saved=1/);
    await expect(page.getByText("Settings saved.")).toBeVisible();
    await expect(cutoffInput).toHaveValue("48");

    // 5. Clear cookies to simulate unauthenticated guest customer
    await page.context().clearCookies();

    // Open public booking page as guest
    await page.goto(`/s/${DEMO_ORG_SLUG}/book`);
    await page.getByRole("button", { name: /Haircut/i }).click();
    await page.getByRole("button", { name: /Maya Petrova/i }).click();
    await page.waitForLoadState("networkidle");

    await page.getByTestId("customer-name-input").fill("Cutoff E2E Guest");
    await page.getByTestId("customer-phone-input").fill("0917 555 4444");

    // Pick a slot on the second day or today (~under 48h)
    // The first slot is today (< 24h), so it's definitely < 48h
    const slot = page.getByTestId("book-slot").first();
    await expect(slot).toBeVisible({ timeout: 15_000 });

    await Promise.all([
      page.waitForURL(new RegExp(`/b/([A-Za-z0-9_-]{43})\\?booked=1`), { timeout: 45_000 }),
      slot.click(),
    ]);

    // 6. On receipt, dynamic cutoff notice displays "48 hours"
    const cutoffNotice = page.getByTestId("cancellation-cutoff-notice");
    await expect(cutoffNotice).toBeVisible();
    await expect(cutoffNotice).toContainText("48 hours");

    // 7. Cancel and reschedule buttons must NOT be rendered
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
