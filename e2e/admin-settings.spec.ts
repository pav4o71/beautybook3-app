import { expect, test } from "@playwright/test";
import { DEMO_ACCOUNT } from "../lib/demo-account";

async function signInAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(DEMO_ACCOUNT.email);
  await page.locator('input[name="password"]').fill(DEMO_ACCOUNT.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/dashboard");
}

test.describe("admin settings & ActionForm runtime checks", () => {
  test.beforeEach(async ({ page }) => {
    await signInAdmin(page);
  });

  test("settings page renders without React encType/method error and saves text fields, checkbox, and cover URL", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/dashboard/admin/settings");
    await expect(page.getByRole("heading", { name: "Business settings" })).toBeVisible();

    // Verify no React form encType/method error or warning was logged
    const problematicErrors = consoleErrors.filter((err) =>
      err.includes("Cannot specify a encType or method") ||
      err.includes("Hydration failed") ||
      err.includes("did not match")
    );
    expect(problematicErrors).toEqual([]);

    // Fill settings text fields, cover image URL, and checkbox
    await page.locator('input[name="name"]').fill("BeautyBook Demo Salon");
    await page.locator('textarea[name="description"]').fill("Makati salon for cuts, colour, and nails. Book online and pay at the salon when you arrive.");
    await page.locator('input[name="phone"]').fill("+63 2 8888 0100");
    await page.locator('input[name="coverImageUrl"]').fill("/images/salons/beautybook-demo.jpg");
    
    // Test checkbox submission
    const publishedCheckbox = page.locator('input[name="published"]');
    await publishedCheckbox.setChecked(true);

    await page.getByRole("button", { name: "Save settings" }).click();

    await page.waitForURL(/\/dashboard\/admin\/settings\?saved=1/);
    await expect(page.getByText("Settings saved.")).toBeVisible();
    await expect(page.locator('input[name="name"]')).toHaveValue("BeautyBook Demo Salon");
    await expect(publishedCheckbox).toBeChecked();
    await expect(page.locator('img[src="/images/salons/beautybook-demo.jpg"]')).toBeVisible();
  });

  test("settings page handles cover image file upload correctly via Server Action", async ({ page }) => {
    await page.goto("/dashboard/admin/settings");

    // 1x1 valid PNG
    const pngBuffer = Buffer.from(
      "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082",
      "hex"
    );

    await page.locator('input[name="coverImage"]').setInputFiles({
      name: "test-cover.png",
      mimeType: "image/png",
      buffer: pngBuffer,
    });

    await page.getByRole("button", { name: "Save settings" }).click();
    await page.waitForURL(/\/dashboard\/admin\/settings\?saved=1/);
    await expect(page.getByText("Settings saved.")).toBeVisible();

    // Verify cover image is rendered with an uploads URL
    const coverImg = page.locator('img[src*="/uploads/orgs/"]');
    await expect(coverImg).toBeVisible();

    // Restore default cover image URL via form to keep DB clean for other tests
    await page.locator('input[name="coverImageUrl"]').fill("/images/salons/beautybook-demo.jpg");
    await page.getByRole("button", { name: "Save settings" }).click();
    await page.waitForURL(/\/dashboard\/admin\/settings\?saved=1/);
    await expect(page.locator('img[src="/images/salons/beautybook-demo.jpg"]')).toBeVisible();
  });

  test("displays validation error when uploading an invalid file format", async ({ page }) => {
    await page.goto("/dashboard/admin/settings");

    await page.locator('input[name="coverImage"]').setInputFiles({
      name: "invalid.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not an image"),
    });

    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Cover image must be JPEG, PNG, or WebP.")).toBeVisible();
  });

  test("all other admin ActionForm routes render cleanly without runtime errors", async ({ page }) => {
    const adminRoutes = [
      "/dashboard/admin/appointments",
      "/dashboard/admin/locations",
      "/dashboard/admin/categories",
      "/dashboard/admin/services",
      "/dashboard/admin/staff",
    ];

    for (const route of adminRoutes) {
      const routeErrors: string[] = [];
      const listener = (msg: import("@playwright/test").ConsoleMessage) => {
        if (msg.type() === "error" || msg.type() === "warning") {
          routeErrors.push(msg.text());
        }
      };
      page.on("console", listener);

      await page.goto(route);
      await page.waitForLoadState("networkidle");

      const encTypeErrors = routeErrors.filter((err) =>
        err.includes("Cannot specify a encType or method")
      );
      expect(encTypeErrors).toEqual([]);
      page.off("console", listener);
    }
  });
});
