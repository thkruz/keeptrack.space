import type { Page } from 'playwright';

export const DEV_SERVER_URL = process.env.BASE_URL ?? 'http://localhost:5544';

export interface DevOverrideOptions {
  configKey: string;
  dependencies: string[];
  catalog: boolean;
  /** false => isStrictPluginList (only the target + deps + alwaysEnabled boot). */
  full: boolean;
}

/**
 * settingsOverride for a focused plugin-dev boot. Mirrors scripts/inspect.ts's
 * buildOverride, adding strict-plugin-list isolation so ONLY the target plugin
 * (plus its declared dependencies and always-enabled infra) loads.
 */
export function buildDevOverride(opts: DevOverrideOptions): Record<string, unknown> {
  const plugins: Record<string, { enabled: boolean }> = {
    [opts.configKey]: { enabled: true },
    // A minimal usable shell so the app is navigable.
    TopMenu: { enabled: true },
    TooltipsPlugin: { enabled: true },
  };

  for (const dep of opts.dependencies) {
    plugins[dep] = { enabled: true };
  }

  return {
    isAutoStart: true,
    noCatalogOnLoad: !opts.catalog,
    minLogLevel: 'WARN',
    isDisablePerformanceDowngrade: true,
    isDisableLoginGate: true,
    isDisableOnboarding: true,
    isStrictPluginList: !opts.full,
    plugins,
  };
}

/** Wait for the app to finish booting (loading screen gone + keepTrack.isReady). */
export async function waitForReady(page: Page): Promise<void> {
  await page.waitForSelector('#loading-screen', { state: 'hidden', timeout: 90_000 });
  await page.waitForFunction(
    () => (window as unknown as { keepTrack?: { isReady?: boolean } }).keepTrack?.isReady === true,
    { timeout: 30_000 },
  );
}

/**
 * Best-effort: open the target plugin's menu via its bottomMenuClicked() handler.
 * Resolved by configKey through the plugin registry — the drawer's data-plugin-id
 * is the bottom-icon element name, not the configKey, so a DOM query by configKey
 * would not match. String-form evaluate dodges the tsx __name trap.
 */
export async function openPluginMenu(page: Page, configKey: string): Promise<void> {
  await page.evaluate(
    `(() => {
      const p = window.keepTrack && window.keepTrack.api && window.keepTrack.api.getPluginByName
        ? window.keepTrack.api.getPluginByName('${configKey}') : null;
      if (p && typeof p.bottomMenuClicked === 'function') { p.bottomMenuClicked(); }
    })()`,
  );
}

/** Poll a URL until it responds or the timeout elapses. */
export async function waitForServer(url: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const ok = await fetch(url).then((r) => r.ok || r.status < 500).catch(() => false);

    if (ok) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }

  return false;
}
