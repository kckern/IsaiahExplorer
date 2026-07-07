/**
 * Jest config for the whole codebase — the Next.js/server layer under lib/ and
 * app-level __tests__/, plus the client SPA tests under src/. (react-scripts is
 * gone; nothing runs these except this config.)
 */
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/lib/**/__tests__/**/*.test.ts',
    '<rootDir>/lib/**/*.test.ts',
    '<rootDir>/__tests__/**/*.test.ts',
    '<rootDir>/src/**/*.test.{js,jsx}',
    '<rootDir>/src/**/__tests__/**/*.test.{js,jsx}',
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
