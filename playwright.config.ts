import { defineConfig } from '@playwright/test';

/**
 * Playwright config for SSR smoke tests.
 *
 * Pure HTTP request tests (no browser automation), so no browser binaries
 * need to be installed. The tests assert that initial server-rendered HTML
 * contains correct <title>, <meta property="og:*">, and <link rel="canonical">
 * for every canonical URL permutation.
 *
 * Run locally:    npm run test:e2e
 * Run against prod: E2E_BASE_URL=https://isaiah.scripture.guide npm run test:e2e
 */
export default defineConfig({
  testDir: './tests-e2e',
  timeout: 30_000,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3001',
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run start:next',
        port: 3001,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
      },
});
