import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BrowserContext, Route } from '@playwright/test';
import { manufacturerCodeMap } from '../../src/app/data/catalogs/manufacturer-codes';
import { ownerCodeMap } from '../../src/app/data/catalogs/owner-codes';

const API_HOST = 'api.keeptrack.space';
const R2_HOST = 'r2.keeptrack.space';
// Resolved from this file, not the working directory, so a run started from another folder still finds the build.
const TLE_DIR = join(fileURLToPath(new URL('../..', import.meta.url)), 'dist', 'tle');
// Committed copies of the deep-space probe ephemerides, so a fresh clone needs no git-ignored public/data/ephemeris folder.
const EPHEMERIS_DIR = join(fileURLToPath(new URL('.', import.meta.url)), 'fixtures', 'ephemeris');

// The app runs on localhost, so every cross-origin answer needs CORS headers or the browser logs an error.
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };

const json = (route: Route, body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(body) });
const file = (route: Route, name: string) => route.fulfill({ contentType: 'application/json', headers: CORS, path: join(TLE_DIR, name) });
const ephemeris = (route: Route) => route.fulfill({ contentType: 'application/json', headers: CORS, path: join(EPHEMERIS_DIR, new URL(route.request().url()).pathname.split('/').pop() ?? '') });

const EPHEMERIS_PATH = /^\/data\/ephemeris\/(?:pioneer-10|pioneer-11|voyager-1|voyager-2|new-horizons)\.json$/u;

type Handler = (route: Route) => Promise<void>;

/**
 * Local answers for the production endpoints every app boot requests, so the production API guard
 * has nothing to block in a normal test. Register AFTER installProductionApiGuard: later context
 * routes run first, and a spec's own page.route() still wins over both. Anything not listed here
 * still reaches the guard and fails the test, so a new endpoint needs a deliberate fixture.
 *
 * The catalog endpoints serve the same offline files the app falls back to when the API is
 * unreachable, so the catalog a test sees is unchanged by this fixture. The R2 data files (stars,
 * constellations, orgs) have no copy in dist/ or public/ that the app could fall back to, so stars
 * and constellations answer empty and orgs answer the bundled maps.
 *
 * Throws at install time when the build output is missing, so the failure names the cause instead
 * of surfacing as an ENOENT inside a route handler.
 */
export async function installDefaultApiMocks(context: BrowserContext): Promise<void> {
  if (!existsSync(join(TLE_DIR, 'tle.json'))) {
    throw new Error(`default API mocks need the offline catalog: ${join(TLE_DIR, 'tle.json')} is missing. Run the build first (npm run build).`);
  }

  const handlers: Record<string, Array<[RegExp, Handler]>> = {
    [API_HOST]: [
      // Site notices (KTOC): none. Only the two shapes the app sends: the menu list (`?limit=N`) and the info box card
      // for the selected satellite (`?limit=N&norad=N`). Selecting a satellite requests the second one, so any spec that
      // selects a satellite needs it answered. Any other filter (activeOnly, status, other keys) does not match and
      // fails closed at the guard.
      [/^\/v4\/notices(?:\?limit=\d+(?:&norad=\d+)?)?$/u, (route) => json(route, { notices: [] })],
      // Per-satellite detail: no extra fields to merge.
      [/^\/v4\/sat\/[^/?]+(?:\?.*)?$/u, (route) => json(route, {})],
      // Fire-and-forget selection analytics.
      [/^\/v4\/analytics\/select$/u, (route) => route.fulfill({ status: 204, headers: CORS })],
      // Most-tracked ranking: empty. Specs that assert rows route their own response.
      [/^\/v4\/stats\/most-tracked$/u, (route) => json(route, { generated_at: '2026-01-01T00:00:00Z', window_hours: 24, top: [], trending: [] })],
      // Primary catalog and JSC Vimpel catalog: the offline copies the app already falls back to.
      [/^\/v4\/sats\/brief(?:\?.*)?$/u, (route) => file(route, 'tle.json')],
      [/^\/v4\/r2\/vimpel\.json$/u, (route) => file(route, 'vimpel.json')],
    ],
    // Deep-space probe ephemerides: always the committed fixture, from R2 and from the app's own server (the
    // fallback path), so results do not depend on whether the git-ignored public/data/ephemeris folder exists.
    localhost: [[EPHEMERIS_PATH, ephemeris]],
    '127.0.0.1': [[EPHEMERIS_PATH, ephemeris]],
    [R2_HOST]: [
      [EPHEMERIS_PATH, ephemeris],
      // Stars and constellations: empty. A 404 would make the app try its local copy (none ships) and log
      // two console errors and a warning per file, which the console guard rejects.
      [/^\/data\/star-catalog\.json$/u, (route) => json(route, [])],
      [/^\/data\/constellations\.json$/u, (route) => json(route, {})],
      // Orgs: the full OrgDatabase shape built from the app's own bundled owner and manufacturer maps, so names
      // resolve as they do offline. A 404 would work too but the browser logs it as a console error, which the guard rejects.
      [/^\/data\/orgs\.json$/u, (route) => json(route, { fetchedAt: '2026-01-01T00:00:00Z', source: 'e2e fixture', count: 0, ownerCodeMap: { ...manufacturerCodeMap, ...ownerCodeMap }, orgs: {} })],
    ],
  };
  const hostOf = (url: URL) => url.hostname.toLowerCase().replace(/\.$/u, '');
  // Patterns match the path plus query string, so notices (exact) answer only the unfiltered boot request and
  // filtered ones (notices?norad=...) fail closed at the guard. Other entries tolerate a query string.
  const find = (url: URL) => handlers[hostOf(url)]?.find(([pattern]) => pattern.test(url.pathname + url.search))?.[1];

  await context.route(
    (url) => find(url) !== undefined,
    async (route) => {
      if (route.request().method() === 'OPTIONS') {
        // CORS preflight (the analytics POST, API key headers).
        await route.fulfill({ status: 204, headers: CORS });

        return;
      }

      const handler = find(new URL(route.request().url()));

      await (handler ? handler(route) : route.fallback());
    },
  );
}
