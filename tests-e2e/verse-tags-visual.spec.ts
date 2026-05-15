import { test } from '@playwright/test';
test('snapshot the Verse Tags box', async ({ page }, info) => {
  test.setTimeout(60_000);
  await page.goto('/whole/chapters/iinst/1/1', { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(2_000);
  const box = page.locator('.verse_info_box.tags').first();
  await box.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(500);
  const m = await box.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { client: el.clientHeight, scroll: el.scrollHeight, maxHeight: cs.maxHeight, overflow: cs.overflow, font: cs.fontFamily, classes: el.className };
  });
  console.log('verse_tags box:', JSON.stringify(m));
  await box.screenshot({ path: info.outputPath('verse-tags-collapsed.png') });
  const readmore = page.locator('.tags-readmore').first();
  console.log('see-more visible:', await readmore.isVisible().catch(() => 'n/a'));
  await readmore.click({ timeout: 5_000 }).catch((e) => console.log('click failed:', e.message));
  await page.waitForTimeout(800);
  await box.screenshot({ path: info.outputPath('verse-tags-expanded.png') });
  const m2 = await box.evaluate((el) => ({ client: el.clientHeight, scroll: el.scrollHeight, classes: el.className }));
  console.log('after expand:', JSON.stringify(m2));
});
