/**
 * Jest config for the Next.js / server-side test layer.
 *
 * This config only matches tests under `lib/server/__tests__/` and
 * other TypeScript test files added during the Next.js migration.
 * Legacy CRA component tests under `src/` continue to run via
 * `react-scripts test` until CRA is removed in Phase 11.
 */
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/lib/**/__tests__/**/*.test.ts',
    '<rootDir>/lib/**/*.test.ts',
    '<rootDir>/__tests__/**/*.test.ts',
  ],
  transform: {
    '^.+\\.tsx?$': ['@swc/jest', {
      jsc: {
        parser: { syntax: 'typescript', tsx: true },
        target: 'es2020',
      },
    }],
    // Transform ES-module JS files (e.g. src/routing/routeCodec.js) so the
    // server tests can import them without a build step.
    '^.+\\.jsx?$': ['@swc/jest', {
      jsc: {
        parser: { syntax: 'ecmascript', jsx: true },
        target: 'es2020',
      },
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};
