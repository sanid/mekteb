import { test as setup, expect } from "@playwright/test";

/**
 * Authenticate each seeded role once per run and persist the session, so the
 * rest of the suite never touches the login form.
 *
 * Why this exists: `signIn` is rate limited to 10 attempts per 15 minutes per
 * IP, and the whole suite shares that budget. Specs that logged in per test
 * burned it and failed every *other* spec with "Too many attempts" — which
 * looked exactly like a broken feature, not a broken harness. With a setup
 * project the run costs 4 logins however many specs it grows; specs declare
 * `dependencies: ["setup"]` in `playwright.config.ts` and read the saved
 * states below.
 *
 * Note the landing portals: teacher@local.test and examiner@local.test both
 * hold "teacher" AND "examiner" memberships (dual roles), so both land on
 * /teacher since teacher outranks examiner in resolvePrimaryRole. The
 * student (Amina) holds no membership at all — she authenticates through
 * `student_profiles` — and lands on /student.
 */
const USERS = [
  { role: "admin", email: "admin@local.test", password: "Mekteb2026!", landing: "admin" },
  { role: "teacher", email: "teacher@local.test", password: "Mekteb2026!", landing: "teacher" },
  { role: "parent", email: "parent@local.test", password: "Mekteb2026!", landing: "parent" },
  { role: "examiner", email: "examiner@local.test", password: "Mekteb2026!", landing: "teacher" },
  { role: "student", email: "amina@students.dev-mosque.mekteb.de", password: "Mekteb2026!", landing: "student" },
] as const;

const STATE_DIR = "e2e/.auth";

for (const { role, email, password, landing } of USERS) {
  setup(`authenticate ${role}`, async ({ page }) => {
    await page.goto("/de/login");
    await page.getByLabel(/e-mail/i).fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: /anmelden|sign in/i }).click();
    await expect(page).toHaveURL(new RegExp(`/de/${landing}(/|$)`));
    await page.context().storageState({ path: `${STATE_DIR}/${role}.json` });
  });
}
