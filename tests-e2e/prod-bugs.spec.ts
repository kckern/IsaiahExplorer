import { test, expect } from '@playwright/test';

/**
 * Reproduce two user-reported bugs in production:
 *   1) All <img> tags are broken
 *   2) The page does a full reload (not soft navigation) on verse changes
 */
test('bugs: img + navigation symptoms', async ({ page }, testInfo) => {
  await page.goto('https://isaiah.scripture.guide/whole/chapters/iinst/1/2', {
    waitUntil: 'networkidle',
    timeout: 30_000,
  });

  // ──── Bug #1: broken images ─────────────────────────────────────────
  const imgReport = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    return imgs.map((img) => ({
      src: img.src,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      complete: img.complete,
      currentSrc: img.currentSrc,
    }));
  });

  const broken = imgReport.filter((i) => i.complete && i.naturalWidth === 0);
  const ok = imgReport.filter((i) => i.complete && i.naturalWidth > 0);
  console.log(`\n=== images (${imgReport.length} total): ${ok.length} OK, ${broken.length} broken ===`);
  console.log('--- broken ---');
  broken.slice(0, 20).forEach((i) => console.log(`  ${i.src}`));
  console.log('--- working (first 5) ---');
  ok.slice(0, 5).forEach((i) => console.log(`  ${i.src}  (${i.naturalWidth}x${i.naturalHeight})`));

  // ──── Bug #2: full reload on verse change ───────────────────────────
  // Plant a sentinel on window. If a full reload happens, the sentinel is lost.
  await page.evaluate(() => {
    (window as any).__sentinel = 'planted-before-nav';
  });

  // Try to find a clickable verse link/element. Print what's clickable first.
  const candidates = await page.evaluate(() => {
    const selectors = ['.versebox', '.verse_text', '[data-verse-id]', 'a[href*="/iinst/"]'];
    const out: Record<string, number> = {};
    for (const sel of selectors) {
      out[sel] = document.querySelectorAll(sel).length;
    }
    return out;
  });
  console.log(`\n=== verse-target candidates ===`);
  console.log(candidates);

  // Click the most likely candidate: any element that, when clicked, sets state.active_verse_id
  // From the screenshot: verses look like <table>/<div> elements that respond to clicks.
  // Try a few selectors.
  const beforeURL = page.url();
  console.log(`\n=== before nav: ${beforeURL}`);

  // The original App is a class component, verse-row click handlers are attached
  // dynamically. Try clicking the next-verse arrow or a different verse box.
  // First, try clicking another verse box (verse 3 or 4) by text content.
  const v3 = page.locator('text=Isaiah 1:3').first();
  const v3Exists = await v3.count();
  console.log(`Isaiah 1:3 link count: ${v3Exists}`);

  if (v3Exists > 0) {
    await v3.click({ timeout: 5_000 }).catch((e) => console.log(`click failed: ${e.message}`));
    await page.waitForTimeout(2_000);
  } else {
    // Try keyboard down arrow which the App listens for (App.js keyDown handler)
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(2_000);
  }

  const afterURL = page.url();
  const sentinelStillThere = await page.evaluate(() => (window as any).__sentinel === 'planted-before-nav');
  console.log(`=== after nav: ${afterURL}`);
  console.log(`=== sentinel preserved (soft nav)? ${sentinelStillThere}`);

  await page.screenshot({ path: testInfo.outputPath('after-nav.png'), fullPage: true });

  // Assertions
  expect(broken.length, `${broken.length} broken images`).toBe(0);
  expect(sentinelStillThere, 'navigation should be soft (no full reload)').toBe(true);
});
