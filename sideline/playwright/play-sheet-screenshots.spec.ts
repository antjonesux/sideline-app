import { test } from "@playwright/test";

const shots: { path: string; file: string }[] = [
  { path: "/qa/play-sheet/home-empty", file: "01-home-empty.png" },
  { path: "/qa/play-sheet/home-list", file: "02-home-list.png" },
  { path: "/qa/play-sheet/create", file: "03-create.png" },
  { path: "/qa/play-sheet/create-ready", file: "04-create-ready.png" },
  { path: "/qa/play-sheet/editor", file: "05-editor.png" },
  { path: "/qa/play-sheet/editor-empty", file: "06-editor-empty.png" },
  { path: "/qa/play-sheet/add-play-formations", file: "07-add-play-formations.png" },
  { path: "/qa/play-sheet/add-play-plays", file: "08-add-play-plays.png" },
  { path: "/qa/play-sheet/edit-sheet", file: "09-edit-sheet.png" },
  { path: "/qa/play-sheet/onboarding-create", file: "10-onboarding-create.png" },
  { path: "/qa/play-sheet/onboarding-editor", file: "11-onboarding-editor.png" },
];

for (const { path: urlPath, file } of shots) {
  test(`play sheet QA: ${file}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(urlPath, { waitUntil: "load", timeout: 60_000 });
    await page.locator("body").waitFor({ state: "visible" });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `qa-screenshots/play-sheet/${file}`,
      fullPage: true,
    });
  });
}
