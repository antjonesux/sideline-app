import { defineConfig } from "@playwright/test";

/**
 * Local onboarding screenshot QA.
 * First-time setup: `npx playwright install chromium`
 * Run `npm run screenshots:onboarding` from `sideline/` (starts dev server if needed).
 */
export default defineConfig({
  testDir: "./playwright",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "off",
  },
  /** If something already serves `baseURL` (e.g. `npm run dev`), Playwright skips starting another Next dev (single lock per repo). */
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "npm run dev",
        url: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
