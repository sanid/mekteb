import { test, expect } from "@playwright/test";

/**
 * Throwaway check: the demo-mode calendar renders the real WeekCalendar.
 * The demo needs no auth — the calendar nav item switches to the view, and
 * the week grid (day rows, group sessions, mosque events) should appear.
 */
test("demo calendar shows the real week calendar", async ({ page }) => {
  await page.goto("/de/demo");
  // Admin role is the default; open the calendar from the sidebar (buttons).
  await page.getByRole("button", { name: /Kalender/i }).first().click();

  // The WeekCalendar scope toggle is admin-visible.
  await expect(page.getByRole("button", { name: "Meine Termine" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ganze Moschee" })).toBeVisible();

  // A demo group session renders on its weekday row.
  await expect(page.getByText("Koran Anfänger", { exact: false }).first()).toBeVisible();

  // A demo mosque event renders with its title.
  await expect(page.getByText("Dschuma-Predigt", { exact: false }).first()).toBeVisible();

  // Week navigation works without touching the URL (demo holds the state).
  const urlBefore = page.url();
  await page.getByLabel("Vorherige Woche").click();
  await expect(page.getByText("Dschuma-Predigt", { exact: false }).first()).toBeVisible();
  expect(page.url()).toBe(urlBefore);
});
