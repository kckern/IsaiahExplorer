import { test, expect } from '@playwright/test';

/**
 * Opening the Settings panel must not throw. The three preview components
 * (Version/Outline/Structure) all do `meta[shortcode].title`, and Settings'
 * initial `shortcode` is null (the useEffect that seeds it runs after the
 * first render). If <Preview> renders on that frame, every preview throws
 * "Cannot read properties of undefined (reading 'title')".
 */
test('opening Settings does not throw', async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));

  await page.goto('/whole/chapters/iinst/1/1', { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(1_500);

  await page.locator('img[alt="Settings"]').first().click({ timeout: 5_000 });
  await page.waitForTimeout(1_500);

  const settingsOpen = await page.locator('#user_prefs').count();
  const previewVisible = await page.locator('#prefs_example').count();
  console.log(`settings panel=${settingsOpen} preview=${previewVisible}`);
  pageErrors.forEach((e) => console.log(`  PAGEERROR ${e}`));
  consoleErrors.filter((e) => !e.includes('favicon') && !e.includes('lockdown')).forEach((e) =>
    console.log(`  CONSOLE.ERR ${e}`),
  );

  expect(pageErrors, 'no uncaught errors').toHaveLength(0);
  expect(
    consoleErrors.filter((e) => !e.includes('favicon') && !e.includes('lockdown')),
    'no console errors',
  ).toHaveLength(0);
  expect(settingsOpen, 'settings panel should render').toBeGreaterThan(0);
  expect(previewVisible, 'preview pane should render').toBeGreaterThan(0);
});
