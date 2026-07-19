import { test } from "@playwright/test";

const shots: { path: string; file: string }[] = [
  { path: "/qa/call-sheet/home", file: "01-home.png" },
  { path: "/qa/call-sheet/situation", file: "02-situation.png" },
  { path: "/qa/call-sheet/empty", file: "03-empty.png" },
  { path: "/qa/call-sheet/menu", file: "04-menu.png" },
  { path: "/qa/call-sheet/switcher", file: "05-switcher.png" },
];

for (const { path: urlPath, file } of shots) {
  test(`call sheet QA: ${file}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(urlPath, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.locator("body").waitFor({ state: "visible" });
    if (file === "04-menu.png") {
      await page.getByRole("dialog", { name: "Call sheet navigation" }).waitFor({ state: "visible" });
    }
    if (file === "05-switcher.png") {
      await page.getByRole("listbox", { name: "Play sheets" }).waitFor({ state: "visible" });
    }
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `qa-screenshots/call-sheet/${file}`,
      fullPage: true,
    });
  });
}
