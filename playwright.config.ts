import { defineConfig, devices } from '@playwright/test';

// Use SwiftShader software GL in CI (no GPU available); real GPU locally for headed mode
const chromiumArgs = process.env.CI
  ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl']
  : ['--enable-webgl'];

export default defineConfig({
  testDir: './src',
  testMatch: '**/__tests__/*.spec.ts',
  // No-op unless E2E_COVERAGE=1; clears/generates the monocart V8 coverage report.
  globalSetup: './test/e2e/coverage-setup.ts',
  globalTeardown: './test/e2e/coverage-teardown.ts',
  fullyParallel: !process.env.CI,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 6,
  reporter: process.env.CI ? 'github' : 'html',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: 'http://localhost:5544',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: chromiumArgs,
        },
      },
    },
  ],
  webServer: {
    command: 'npm run start:ci',
    url: 'http://localhost:5544',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
