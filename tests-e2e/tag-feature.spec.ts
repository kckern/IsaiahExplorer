import { test, expect, Page } from '@playwright/test';

/**
 * Exercises the tagging feature and the four tag views (blocks / chiasm /
 * parallel / citation). Each test captures console + page errors and asserts
 * the view-specific DOM actually rendered.
 *
 * Fixtures are real tags pulled from core.txt:
 *   regular  → destruction      (32:19)
 *   chiasm   → chaos-creation   (41:2)
 *   parallel → servant-tyrant   (14:1)
 *   citation → nephi            (29:4)
 */

function collectErrors(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => pageErrors.push(e.message));
  return { consoleErrors, pageErrors };
}

async function waitForApp(page: Page) {
  await page
    .waitForFunction(() => !document.body.innerText.includes('Loading Passage Text'), { timeout: 15_000 })
    .catch(() => {});
  await page.waitForTimeout(1_500);
}

const TAG_VIEWS = [
  { kind: 'regular', url: '/whole/chapters/iinst/tag.destruction/32/19', marker: '#text.blocks.tagged', name: 'Destruction' },
  { kind: 'chiasm', url: '/whole/chapters/iinst/tag.chaos-creation/41/2', marker: '#text.chiasm.tagged', name: 'Chaos' },
  { kind: 'parallel', url: '/whole/chapters/iinst/tag.servant-tyrant/14/1', marker: '#parTable', name: 'Servant' },
  { kind: 'citation', url: '/whole/chapters/iinst/tag.nephi/29/4', marker: '#text.blocks.tagged', name: 'Nephi' },
];

for (const view of TAG_VIEWS) {
  test(`tag deep-link renders the ${view.kind} view`, async ({ page }) => {
    const { consoleErrors, pageErrors } = collectErrors(page);
    await page.goto(view.url, { waitUntil: 'networkidle', timeout: 30_000 });
    await waitForApp(page);

    const headingText = await page.locator('.tagtitle span').first().innerText().catch(() => '(no .tagtitle)');
    const markerCount = await page.locator(view.marker).count();
    const tagMetaCount = await page.locator('.tag_meta').count();
    console.log(`[${view.kind}] url=${page.url()}`);
    console.log(`  .tagtitle="${headingText}"  marker(${view.marker})=${markerCount}  .tag_meta=${tagMetaCount}`);
    console.log(`  console errors=${consoleErrors.length} page errors=${pageErrors.length}`);
    pageErrors.forEach((e) => console.log(`  PAGE ERROR: ${e}`));
    consoleErrors.filter((e) => !e.includes('favicon')).forEach((e) => console.log(`  CONSOLE ERROR: ${e}`));

    expect(pageErrors, `${view.kind}: no uncaught errors`).toHaveLength(0);
    expect(consoleErrors.filter((e) => !e.includes('favicon')), `${view.kind}: no console errors`).toHaveLength(0);
    expect(markerCount, `${view.kind}: ${view.marker} should render`).toBeGreaterThan(0);
    expect(headingText.toLowerCase(), `${view.kind}: heading shows tag name`).toContain(view.name.toLowerCase());
  });
}

test('clicking a verse tag enters tag mode and updates the URL', async ({ page }) => {
  const { pageErrors } = collectErrors(page);
  await page.goto('/whole/chapters/iinst/1/2', { waitUntil: 'networkidle', timeout: 30_000 });
  await waitForApp(page);

  const verseTagLinks = page.locator('.taglink');
  const count = await verseTagLinks.count();
  console.log(`verse tag links found: ${count}`);
  expect(count, 'verse column should list tags').toBeGreaterThan(0);

  const firstTag = await verseTagLinks.first().innerText();
  await verseTagLinks.first().click({ timeout: 5_000 });
  await page.waitForTimeout(2_000);

  const url = page.url();
  const tagMetaCount = await page.locator('.tag_meta').count();
  console.log(`clicked "${firstTag}" → url=${url}  .tag_meta=${tagMetaCount}`);
  pageErrors.forEach((e) => console.log(`  PAGE ERROR: ${e}`));

  expect(pageErrors, 'no errors on tag click').toHaveLength(0);
  expect(url, 'URL should carry /tag.').toContain('/tag.');
  expect(tagMetaCount, 'tag panel should be present').toBeGreaterThan(0);
});

test('tag tree opens from the tag heading', async ({ page }) => {
  const { pageErrors } = collectErrors(page);
  await page.goto('/whole/chapters/iinst/tag.destruction/32/19', { waitUntil: 'networkidle', timeout: 30_000 });
  await waitForApp(page);

  await page.locator('.tag_meta').first().click({ timeout: 5_000 });
  await page.waitForTimeout(1_500);

  const treeCount = await page.locator('.tagtree').count();
  const taxCount = await page.locator('.tagTax').count();
  console.log(`after opening tree: .tagtree=${treeCount} .tagTax=${taxCount}`);
  pageErrors.forEach((e) => console.log(`  PAGE ERROR: ${e}`));

  expect(pageErrors, 'no errors opening tag tree').toHaveLength(0);
  expect(treeCount, 'tag tree should render').toBeGreaterThan(0);
});

test('prev/next tag navigation cycles tags', async ({ page }) => {
  const { pageErrors } = collectErrors(page);
  await page.goto('/whole/chapters/iinst/tag.destruction/32/19', { waitUntil: 'networkidle', timeout: 30_000 });
  await waitForApp(page);

  const before = await page.locator('.tagtitle span').first().innerText();
  const nextBtn = page.locator('#tag_next');
  const hasNext = await nextBtn.count();
  console.log(`starting tag="${before}"  #tag_next present=${hasNext}`);
  expect(hasNext, '#tag_next should exist (Destruction has a next tag)').toBeGreaterThan(0);

  await nextBtn.click({ timeout: 5_000 });
  await page.waitForTimeout(2_000);
  const after = await page.locator('.tagtitle span').first().innerText();
  console.log(`after #tag_next: tag="${after}"  url=${page.url()}`);
  pageErrors.forEach((e) => console.log(`  PAGE ERROR: ${e}`));

  expect(pageErrors, 'no errors on prev/next').toHaveLength(0);
  expect(after, 'tag should change after clicking next').not.toBe(before);
});
