import { defineConfig } from '@playwright/test';

/** H: DOM chrome screenshots. Baselines live in .metrics/ui/snapshots (local, not committed). Run: pnpm exec playwright test -c scripts/gates/ui/playwright.config.ts [--update-snapshots] */
const PORT = Number(process.env.KEEPTRACK_DEV_PORT ?? 5598);

export default defineConfig({
  testDir: '.',
  testMatch: 'chrome-screenshot.spec.ts',
  snapshotPathTemplate: '../../../.metrics/ui/snapshots/{testName}-{arg}{ext}',
  outputDir: '../../../.metrics/ui/pw-results',
  timeout: 120_000,
  workers: 1,
  reporter: 'list',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled' } },
  use: { baseURL: `http://localhost:${PORT}`, channel: 'chrome', serviceWorkers: 'block', launchOptions: { args: ['--enable-webgl', '--ignore-gpu-blocklist'] } },
  webServer: { command: 'pnpm exec tsx build/dev-server.ts --static', cwd: '../../..', port: PORT, reuseExistingServer: true, env: { KEEPTRACK_DEV_PORT: String(PORT) } },
});
