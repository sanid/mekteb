import { expect, test } from "@playwright/test";

/**
 * The week calendar, which every portal now carries.
 *
 * Worth an end-to-end test rather than a unit one: the scoping lives in
 * `lib/calendar-data.ts` but what it returns depends on RLS, and the bug this
 * feature shipped with — group names coming back null in the mosque scope,
 * because `groups_select` only exposes the groups you belong to — was
 * invisible to every layer except a real session against a real database.
 *
 * Sessions come from the `setup` project (`auth.setup.ts`), never from a
 * login here: `signIn` is rate limited to 10 attempts per 15 minutes per IP
 * and the whole suite shares that budget. See the comment in `auth.setup.ts`.
 */

const PARENT_STATE = "e2e/.auth/parent.json";
const TEACHER_STATE = "e2e/.auth/teacher.json";

test.describe("parent portal", () => {
  test.use({ storageState: PARENT_STATE });

  test("renders a week of seven days", async ({ page }) => {
    await page.goto("/de/parent/calendar");

    await expect(page.getByRole("heading", { name: "Kalender" })).toBeVisible();
    // Seven day cards, Monday first, whether or not anything is scheduled.
    await expect(page.getByRole("heading", { name: "Montag" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sonntag" })).toBeVisible();

    await expect(page.getByRole("button", { name: "Meine Termine" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Ganze Moschee" })).toBeVisible();
  });

  test("the mosque scope names its lessons", async ({ page }) => {
    // A week the seed fills with sessions; the current week may be empty.
    await page.goto("/de/parent/calendar?week=2026-08-03&scope=mosque");

    await expect(page.locator("section").first()).toBeVisible();

    // The regression: every lesson must carry a group name. A row falling back
    // to the generic "Unterricht" label means `group_directory` stopped
    // resolving and the reader is looking at an anonymous timetable.
    await expect(page.getByText("Unterricht", { exact: true })).toHaveCount(0);
    await expect(page.getByText(/Mekteb|Hifz|Tajweed/).first()).toBeVisible();
  });

  test("paging weeks keeps the chosen scope", async ({ page }) => {
    // "Zurück zu heute" only renders when the displayed week is not the
    // current one, so pick a start week two weeks back from today — paging
    // forward once stays in the past regardless of when the suite runs.
    const mondayOf = (d: Date): Date => {
      const copy = new Date(d);
      copy.setHours(0, 0, 0, 0);
      copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7));
      return copy;
    };
    const iso = (d: Date): string =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const addDays = (d: Date, n: number): Date => {
      const copy = new Date(d);
      copy.setDate(copy.getDate() + n);
      return copy;
    };

    const startWeek = iso(addDays(mondayOf(new Date()), -14));
    const nextWeek = iso(addDays(new Date(`${startWeek}T00:00:00`), 7));

    await page.goto(`/de/parent/calendar?week=${startWeek}&scope=mosque`);
    await expect(page.getByRole("button", { name: "Nächste Woche" })).toBeVisible();

    await page.getByRole("button", { name: "Nächste Woche" }).click();
    await expect(page).toHaveURL(new RegExp(`week=${nextWeek}`));
    await expect(page).toHaveURL(/scope=mosque/);
    await expect(page.getByRole("button", { name: "Zurück zu heute" })).toBeVisible();
  });
});

test.describe("staff portals", () => {
  test.use({ storageState: TEACHER_STATE });

  // The seeded teacher account holds an examiner membership too, so one
  // session covers both portals — and the four pages differ only in which
  // guard they call.
  for (const portal of ["teacher", "examiner"] as const) {
    test(`${portal}: the calendar renders`, async ({ page }) => {
      await page.goto(`/de/${portal}/calendar`);
      await expect(page.getByRole("heading", { name: "Kalender" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Montag" })).toBeVisible();
    });
  }
});
