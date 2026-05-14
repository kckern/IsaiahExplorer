import { test, expect } from '@playwright/test';

/**
 * Regression: verse navigation must stay client-side (no RSC refetch, no
 * AppClient remount), and the Roboto Condensed UI webfont must load.
 *
 * Localising signals:
 *   - core.txt refetch    => App.js remounted (componentDidMount -> loadCore)
 *   - #approot identity   => React unmounted/remounted the whole app
 *   - request volume      => navigation cold-boots every dataset
 */
test('verse selection does not remount the app; font loads', async ({ page }) => {
  const reqs: string[] = [];
  page.on('request', (r) => reqs.push(r.url()));

  await page.goto('/whole/chapters/iinst/1/2', { waitUntil: 'networkidle', timeout: 30_000 });
  await page
    .waitForFunction(() => !document.body.innerText.includes('Loading Passage Text'), { timeout: 15_000 })
    .catch(() => console.log('WARN: still loading at baseline'));
  await page.waitForTimeout(1_000);

  const countCore = () => reqs.filter((u) => /core\.txt/.test(u)).length;

  // ── Roboto Condensed must be available ──────────────────────────────
  const fontLoaded = await page.evaluate(async () => {
    await (document as any).fonts.ready;
    return (document as any).fonts.check('16px "Roboto Condensed"');
  });
  console.log(`Roboto Condensed loaded? ${fontLoaded}`);

  // ── Click navigation (replace=false path) ───────────────────────────
  const approot = await page.$('#approot');
  const verseboxCount = await page.locator('.versebox').count();
  const baseCore = countCore();
  const baseTotal = reqs.length;

  await page.locator('.versebox').nth(Math.min(8, verseboxCount - 1)).click({ timeout: 5_000 });
  await page.waitForTimeout(3_000);

  const clickCoreDelta = countCore() - baseCore;
  const clickTotalDelta = reqs.length - baseTotal;
  const approotConnected = approot ? await approot.evaluate((n) => n.isConnected) : false;
  console.log(`click nav: url=${page.url()}`);
  console.log(`  core.txt refetch delta=${clickCoreDelta}  total req delta=${clickTotalDelta}  #approot stable=${approotConnected}`);

  // ── Keyboard navigation (replace=true path) ─────────────────────────
  const baseCore2 = countCore();
  const baseTotal2 = reqs.length;
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(2_000);
  const keyCoreDelta = countCore() - baseCore2;
  const keyTotalDelta = reqs.length - baseTotal2;
  const approotConnected2 = approot ? await approot.evaluate((n) => n.isConnected) : false;
  console.log(`key nav:   url=${page.url()}`);
  console.log(`  core.txt refetch delta=${keyCoreDelta}  total req delta=${keyTotalDelta}  #approot stable=${approotConnected2}`);

  expect(fontLoaded, 'Roboto Condensed webfont loaded').toBe(true);
  expect(clickCoreDelta, 'click nav must not refetch core.txt (no remount)').toBe(0);
  expect(approotConnected, 'click nav must not remount #approot').toBe(true);
  expect(clickTotalDelta, 'click nav must not cold-boot datasets').toBeLessThan(8);
  expect(keyCoreDelta, 'key nav must not refetch core.txt').toBe(0);
  expect(approotConnected2, 'key nav must not remount #approot').toBe(true);
});
