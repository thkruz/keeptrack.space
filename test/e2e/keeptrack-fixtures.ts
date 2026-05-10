import { type Page } from '@playwright/test';
import {
  type AllowlistEntry,
  type ListenerHandle,
  assertNoConsoleViolations,
  attachConsoleListener,
} from './console-listener';

export interface AppReadyOptions {
  plugins?: Record<string, { enabled: boolean }>;
  settings?: Record<string, unknown>;
  /**
   * Extra allowlist entries appended to DEFAULT_ALLOWLIST for this test.
   * Use sparingly — prefer fixing the warning at the source.
   */
  consoleAllowlist?: AllowlistEntry[];
}

const listenerByPage = new WeakMap<Page, ListenerHandle>();

/**
 * Intercepts settingsOverride.js and injects E2E-friendly settings,
 * then navigates to the app and waits for it to fully initialize.
 *
 * Also attaches a console listener that records every non-allowlisted
 * console.warn / console.error / pageerror. Tests that want to assert
 * a clean boot call `expectCleanBoot(page)` afterwards.
 */
export async function waitForAppReady(page: Page, options: AppReadyOptions = {}): Promise<void> {
  if (!listenerByPage.has(page)) {
    const { DEFAULT_ALLOWLIST } = await import('./console-listener');
    const allowlist = options.consoleAllowlist
      ? [...DEFAULT_ALLOWLIST, ...options.consoleAllowlist]
      : DEFAULT_ALLOWLIST;

    listenerByPage.set(page, attachConsoleListener(page, allowlist));
  }

  const overrideObj = {
    isAutoStart: true,
    noCatalogOnLoad: true,
    plugins: options.plugins ?? {},
    ...(options.settings ?? {}),
  };

  await page.route('**/settings/settingsOverride.js', async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: `window.settingsOverride = ${JSON.stringify(overrideObj)};`,
    });
  });

  await page.goto('/');
  await page.waitForSelector('#loading-screen', { state: 'hidden', timeout: 45_000 });

  // Wait for the app to signal it is fully ready (all plugins, drawer, etc.)
  await page.waitForFunction(
    () => (window as unknown as { keepTrack?: { isReady?: boolean } }).keepTrack?.isReady === true,
    { timeout: 15_000 },
  );
}

/**
 * Asserts that no console.warn / console.error / pageerror events have been
 * captured on this page since waitForAppReady was first called. Failures
 * include the captured text and source location so the cause is obvious
 * from CI logs alone.
 */
export function expectCleanBoot(page: Page): void {
  const handle = listenerByPage.get(page);

  if (!handle) {
    throw new Error('expectCleanBoot called before waitForAppReady — no listener attached');
  }
  assertNoConsoleViolations(handle);
}
