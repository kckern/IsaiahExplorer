import { test, expect } from '@playwright/test';

/**
 * Responsive-layout acceptance gate.
 *
 * Unlike the other specs in this dir (pure HTTP/SSR assertions), these drive a
 * real browser — they need `npx playwright install chromium` and a running
 * server (the config's webServer, or E2E_BASE_URL). They are RED until the
 * fluid-grid (Task 23) and mobile tab-bar (Task 24) layout work lands, and are
 * the acceptance criteria for that work.
 */

const VIEWPORTS = [
  { w: 390, h: 844, name: 'iphone' },
  { w: 820, h: 1180, name: 'ipad' },
  { w: 1280, h: 800, name: 'laptop' },
  { w: 1920, h: 1080, name: 'desktop' },
];

for (const vp of VIEWPORTS) {
  test(`no horizontal document scroll at ${vp.name} (${vp.w}px)`, async ({ page }) => {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.goto('/whole/chapters/kjv/1/1');
    await page.waitForSelector('#approot');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('mobile shows the reading pane and a tab bar; side columns hidden', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/whole/chapters/kjv/1/1');
  await page.waitForSelector('#approot');
  await expect(page.locator('.mobile-tabbar')).toBeVisible();
  await expect(page.locator('.col3')).toBeVisible();
  await expect(page.locator('.col1')).toBeHidden();
});

test('desktop shows all four columns', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/whole/chapters/kjv/1/1');
  await page.waitForSelector('#approot');
  for (const col of ['.col1', '.col2b', '.col3', '.col2']) {
    await expect(page.locator(col).first()).toBeVisible();
  }
});
