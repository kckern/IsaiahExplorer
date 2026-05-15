import { test, expect } from '@playwright/test';

test('side-by-side translations load actual text, not stuck on Loading', async ({ page }) => {
  test.setTimeout(60_000);
  page.on('pageerror', (e) => console.log('  PAGEERROR', e.message));
  await page.goto('/whole/chapters/iinst/1/1', { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(1_500);

  // The version_views default is 1. Bump it to 5 via the "vernum" toggle.
  const vernum = page.locator('.vernum');
  if (await vernum.count() > 0) {
    for (let i = 0; i < 4; i++) await vernum.first().click({ timeout: 5_000 });
  }
  await page.waitForTimeout(3_000);

  const cells = await page.locator('.extraversions tr.cells td').allInnerTexts();
  console.log('extraversions cells:', cells.map((c) => c.slice(0, 40)));
  const stillLoading = cells.filter((c) => c.includes('Loading')).length;
  console.log('cells stuck on "Loading":', stillLoading, '/', cells.length);
  expect(cells.length, 'should have multiple side-by-side cells').toBeGreaterThan(1);
  expect(stillLoading, 'no cell should be stuck on Loading').toBe(0);
});
