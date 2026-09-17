import { expect, test, type Page } from "@playwright/test";

/**
 * Mosque brand colour: saving it must stick, and it must only restyle the
 * portals — the public landing page always keeps the default Mekteb green.
 */

const ADMIN_STATE = "e2e/.auth/admin.json";
const DEFAULT_PRIMARY = "#15803d";

test.use({ storageState: ADMIN_STATE });

test("admin can save the primary colour", async ({ page }) => {
  const colour = "#7c3aed";
  await page.goto("/de/admin/settings?tab=general");

  const picker = page.locator('input[type="color"][name="primary_color"]');
  await picker.fill(colour);
  await picker.locator("xpath=ancestor::form").getByRole("button", { name: /speichern/i }).click();
  await expect(page.getByText("Einstellungen gespeichert")).toBeVisible();

  await page.reload();
  await expect(page.locator('input[type="color"][name="primary_color"]')).toHaveValue(colour);

  // The portal itself is branded…
  expect(await primaryVar(page)).toBe(colour);
});

test("landing page keeps the default green for a signed-in mosque user", async ({ page }) => {
  // …the public landing page is not.
  await page.goto("/de");
  expect(await primaryVar(page)).toBe(DEFAULT_PRIMARY);
});

async function primaryVar(page: Page) {
  const value = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--primary").trim(),
  );
  return value.toLowerCase();
}
