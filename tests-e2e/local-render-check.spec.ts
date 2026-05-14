import { test, expect } from '@playwright/test';

/**
 * Local-only smoke: load the SPA in a real browser, assert that every <img>
 * the hydrated app renders is a real image with non-zero natural dimensions.
 * Uses the configured baseURL (localhost:3001 by default, prod when
 * E2E_BASE_URL is set) and is meant to live alongside the prod-bugs spec.
 */
test('all hydrated <img> elements load (non-zero naturalWidth)', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto('/whole/chapters/iinst/1/2', {
    waitUntil: 'networkidle',
    timeout: 30_000,
  });

  // Wait briefly so React has populated the four columns.
  await page.waitForTimeout(2_000);

  const imgs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('img')).map((img) => ({
      src: img.src,
      naturalWidth: img.naturalWidth,
      complete: img.complete,
    })),
  );
  const broken = imgs.filter((i) => i.complete && i.naturalWidth === 0);
  console.log(`images: ${imgs.length} total, ${broken.length} broken`);
  broken.slice(0, 10).forEach((b) => console.log(`  BROKEN ${b.src}`));

  await page.screenshot({ path: testInfo.outputPath('page.png'), fullPage: true });

  expect(pageErrors, 'no uncaught page errors').toHaveLength(0);
  expect(consoleErrors.filter((e) => !e.includes('favicon')), 'no console errors').toHaveLength(0);
  expect(broken.length, 'no broken images').toBe(0);
});
