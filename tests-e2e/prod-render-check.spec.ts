import { test, expect } from '@playwright/test';

/**
 * Smoke test for the live production site after the Next.js SSR migration.
 * Loads a representative deep URL in a real browser, captures any console
 * errors / failed requests, and screenshots the result.
 */
test('live: /whole/chapters/iinst/1/2 renders without errors', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    pageErrors.push(err.message + '\n' + (err.stack ?? ''));
  });
  page.on('requestfailed', (req) => {
    failedRequests.push(`${req.method()} ${req.url()}  ⇒  ${req.failure()?.errorText}`);
  });

  await page.goto('https://isaiah.scripture.guide/whole/chapters/iinst/1/2', {
    waitUntil: 'networkidle',
    timeout: 30_000,
  });

  // Capture screenshot
  await page.screenshot({ path: testInfo.outputPath('full-page.png'), fullPage: true });

  // Look for the app root + visible verse content
  const rootHTML = await page.locator('#approot').first().innerHTML().catch(() => '<no #approot>');
  const bodyText = await page.locator('body').innerText();

  console.log('\n=== body text (first 800 chars) ===');
  console.log(bodyText.slice(0, 800));
  console.log('\n=== #approot html size ===');
  console.log(rootHTML.length + ' chars');
  console.log('\n=== console errors (' + consoleErrors.length + ') ===');
  consoleErrors.forEach((e) => console.log('  ' + e));
  console.log('\n=== page errors (' + pageErrors.length + ') ===');
  pageErrors.forEach((e) => console.log('  ' + e.split('\n')[0]));
  console.log('\n=== failed requests (' + failedRequests.length + ') ===');
  failedRequests.forEach((r) => console.log('  ' + r));

  // Hard assertions
  expect(pageErrors, 'no uncaught page errors').toHaveLength(0);
  expect(consoleErrors.filter((e) => !e.includes('favicon')), 'no console errors').toHaveLength(0);
  expect(bodyText.length, 'body has visible text').toBeGreaterThan(200);
});
