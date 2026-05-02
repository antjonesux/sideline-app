import { test } from "@playwright/test";

const shots: { path: string; file: string }[] = [
  { path: "/qa/onboarding/carousel", file: "01-carousel.png" },
  { path: "/qa/onboarding/new-play-sheet", file: "02-new-play-sheet.png" },
  { path: "/qa/onboarding/play-sheet-details", file: "03-play-sheet-details.png" },
  { path: "/qa/onboarding/logger", file: "04-logger.png" },
  { path: "/qa/onboarding/yardage", file: "05-yardage.png" },
  { path: "/qa/onboarding/breakdown", file: "06-breakdown.png" },
];

for (const { path: urlPath, file } of shots) {
  test(`onboarding QA: ${file}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(urlPath, { waitUntil: "load", timeout: 60_000 });
    await page.locator("body").waitFor({ state: "visible" });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `qa-screenshots/onboarding/${file}`,
      fullPage: true,
    });
  });
}
