import { expect, test } from "@playwright/test";

/**
 * Student portal smoke tests — the student role (Amina) holds no `memberships`
 * row, so every page here is a quiet RLS regression check: if a policy forgot
 * the student branch, these pages render empty. The notes views were added
 * 2026-08-09 (see 4.4 in MEMORY.md); the attendance stats strip is on the
 * attendance page.
 */

const STUDENT_STATE = "e2e/.auth/student.json";

test.describe("student portal", () => {
  test.use({ storageState: STUDENT_STATE });

  test("dashboard opens with the student nav", async ({ page }) => {
    await page.goto("/de/student");
    await expect(page.getByRole("link", { name: "Meine Lernnotizen" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Wochenzusammenfassungen" })).toBeVisible();
  });

  test("progress notes page renders", async ({ page }) => {
    await page.goto("/de/student/progress-notes");
    await expect(
      page.getByRole("heading", { name: "Meine Lernnotizen", exact: true }),
    ).toBeVisible();
  });

  test("weekly notes page renders", async ({ page }) => {
    await page.goto("/de/student/weekly-notes");
    await expect(
      page.getByRole("heading", { name: "Wochenzusammenfassungen", exact: true }),
    ).toBeVisible();
  });

  test("attendance page renders the stats strip", async ({ page }) => {
    await page.goto("/de/student/attendance");
    await expect(page.getByRole("heading", { name: "Anwesenheit", exact: true })).toBeVisible();
  });
});
