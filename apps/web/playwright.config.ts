import { defineConfig } from "@playwright/test";

/**
 * The login form is rate limited to 10 attempts per 15 minutes per IP, and
 * the whole suite shares that budget. So authentication happens exactly once
 * per run, in the `setup` project (`e2e/auth.setup.ts`), which signs each
 * seeded role in and saves a `storageState` under `e2e/.auth/`. Every other
 * spec depends on `setup` and reads those files, so the run costs 4 logins
 * however many specs it grows.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  timeout: 60_000,
  expect: {
    timeout: 30_000,
  },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    // Signs each seeded role in once; writes e2e/.auth/{admin,teacher,parent,examiner}.json
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    // Everything else; guaranteed to run after setup has written the states.
    {
      name: "app",
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts/,
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
