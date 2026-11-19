import { defineConfig, devices } from '@playwright/test';
import { viewportUse } from './test/e2e/viewports';

// Use SwiftShader software GL in CI (no GPU available); real GPU locally for headed mode
const chromiumArgs = process.env.CI
  ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl']
  : ['--enable-webgl'];

// Port of the server under test. A runner that builds its own dist/ sets KEEPTRACK_DEV_PORT so it never
// touches the shared dev server on 5544 (build/dev-server.ts reads the same variable).
const PORT = Number(process.env.KEEPTRACK_DEV_PORT ?? 5544);

export default defineConfig({
  testDir: './src',
  testMatch: '**/__tests__/*.spec.ts',
  // Screenshot baselines and perf gates are tagged @local: they depend on this machine's GPU,
  // so CI (SwiftShader) never runs them.
  ...(process.env.CI ? { grepInvert: /@local/u } : {}),
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
    baseURL: `http://localhost:${PORT}`,
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
    // Viewport projects (#614) run only specs tagged @viewports, so functional specs do not triple.
    // Sizes come from test/e2e/viewports.json; the phone user agent switches the app into mobile mode.
    {
      name: 'laptop',
      grep: /@viewports/u,
      use: {
        ...devices['Desktop Chrome'],
        ...viewportUse('laptop'),
        launchOptions: { args: chromiumArgs },
      },
    },
    {
      name: 'phone',
      grep: /@viewports/u,
      use: {
        ...devices['Desktop Chrome'],
        ...viewportUse('phone'),
        launchOptions: { args: chromiumArgs },
      },
    },
    // 360 px phone (#614): only specs tagged @narrow, the core chrome checks.
    {
      name: 'phone-narrow',
      grep: /@narrow/u,
      use: {
        ...devices['Desktop Chrome'],
        ...viewportUse('phone-narrow'),
        launchOptions: { args: chromiumArgs },
      },
    },
  ],
  webServer: {
    command: 'npm run start:ci',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
