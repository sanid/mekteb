import { expect, test } from "@playwright/test";

/**
 * The login flow itself, plus the redirect contract.
 *
 * Only ONE test here performs a live login. The per-role redirects are
 * already asserted by `auth.setup.ts` (which must land on the right portal to
 * save a state), and signing in per test burns the shared 10-attempts/15-min
 * rate-limit budget — see the comment in `auth.setup.ts`.
 */

const ADMIN_STATE = "e2e/.auth/admin.json";
const TEACHER_STATE = "e2e/.auth/teacher.json";

test("the login form signs in an admin and lands on the admin portal", async ({ page }) => {
  await page.goto("/de/login");
  await page.getByLabel(/e-mail/i).fill("admin@local.test");
  await page.locator('input[name="password"]').fill("Mekteb2026!");
  await page.getByRole("button", { name: /anmelden|sign in/i }).click();
  await expect(page).toHaveURL(/\/de\/admin(\/|$)/);
  await expect(page.getByRole("heading", { name: /Übersicht|Dashboard/i })).toBeVisible();
});

test("a wrong password shows an error and stays on the login page", async ({ page }) => {
  // Deliberately a non-seeded email: the rate limit is keyed per email, and
  // this test must not spend the seeded accounts' budget.
  await page.goto("/de/login");
  await page.getByLabel(/e-mail/i).fill("nobody@test.invalid");
  await page.locator('input[name="password"]').fill("wrong-password");
  await page.getByRole("button", { name: /anmelden|sign in/i }).click();
  await expect(page).toHaveURL(/\/de\/login(\/|$)/);
  await expect(page.getByRole("alert")).toBeVisible();
});

test.describe("signed-in redirects", () => {
  test.use({ storageState: ADMIN_STATE });
  test("admin session opens the admin portal", async ({ page }) => {
    await page.goto("/de/admin");
    await expect(page).toHaveURL(/\/de\/admin(\/|$)/);
  });
});

test("teacher portal is reachable for the dual teacher/examiner account", async ({ browser }) => {
  // teacher@local.test holds teacher AND examiner memberships; the setup
  // session (landing on /teacher) serves both portals.
  const context = await browser.newContext({ storageState: TEACHER_STATE });
  const teacherPage = await context.newPage();

  await teacherPage.goto("/de/teacher");
  await expect(teacherPage).toHaveURL(/\/de\/teacher(\/|$)/);
  await context.close();
});
