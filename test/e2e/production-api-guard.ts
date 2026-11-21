import type { BrowserContext } from '@playwright/test';

/**
 * The root suite must never spend the production API's budget. Register before
 * creating pages: per-test page routes can fulfil fixtures, and route.fallback()
 * reaches this guard. Unknown endpoints fail closed, including filtered notices.
 * This is browser-request containment, not a guard for Node/APIRequestContext.
 */
export async function installProductionApiGuard(context: BrowserContext): Promise<() => void> {
  const blocked = new Set<string>();

  await context.route((url) => url.hostname.toLowerCase().replace(/\.$/u, '') === 'api.keeptrack.space', async (route) => {
    const request = route.request();

    // Never include query strings or headers: they may contain an API key.
    blocked.add(`${request.method()} ${new URL(request.url()).pathname}`);
    await route.abort('blockedbyclient');
  });

  return () => {
    if (blocked.size) {
      throw new Error(`E2E blocked production API requests; add local route fixtures:\n${[...blocked].sort().join('\n')}`);
    }
  };
}
