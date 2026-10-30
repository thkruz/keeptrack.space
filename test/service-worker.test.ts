import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { vi } from 'vitest';

/*
 * Runs public/serviceWorker.js against stub `self`, `caches` and `fetch` so the
 * fetch strategies can be exercised without a browser. Covers the handler logic
 * only; registration and real Cache Storage need a browser.
 */
const SW_SOURCE = readFileSync(resolve(__dirname, '../public/serviceWorker.js'), 'utf8');
const ORIGIN = 'https://app.keeptrack.space';

interface FakeEvent {
  request: { method: string; url: string; mode: string };
  respondWith: (p: Promise<Response>) => void;
}

const loadWorker = (opts: { putRejects?: boolean; networkFails?: boolean; cached?: Response }) => {
  const listeners: Record<string, (e: FakeEvent) => void> = {};
  const puts: string[] = [];
  const cache = {
    put: (req: { url?: string } | string) => {
      puts.push(typeof req === 'string' ? req : (req.url ?? ''));

      return opts.putRejects ? Promise.reject(new DOMException('quota', 'QuotaExceededError')) : Promise.resolve();
    },
    addAll: () => Promise.resolve(),
  };
  const fakeSelf = {
    addEventListener: (type: string, cb: (e: FakeEvent) => void) => {
      listeners[type] = cb;
    },
    location: { origin: ORIGIN },
    skipWaiting: () => undefined,
  };
  const fakeCaches = {
    open: () => Promise.resolve(cache),
    match: () => Promise.resolve(opts.cached?.clone()),
    keys: () => Promise.resolve([]),
    delete: () => Promise.resolve(true),
  };
  const fakeFetch = () => (opts.networkFails ? Promise.reject(new TypeError('offline')) : Promise.resolve(new Response('fresh', { status: 200 })));

  new Function('self', 'caches', 'fetch', SW_SOURCE)(fakeSelf, fakeCaches, fakeFetch);

  const handle = (url: string, mode = 'cors', method = 'GET'): Promise<Response> | undefined => {
    let responded: Promise<Response> | undefined;

    listeners.fetch({ request: { method, url, mode }, respondWith: (p) => (responded = p) });

    return responded;
  };

  return { handle, puts };
};

/** Let the fire-and-forget cache writes settle so an unhandled rejection would surface. */
const settle = () => new Promise((r) => setTimeout(r, 10));

const ROUTES: [string, string, string][] = [
  ['navigation', `${ORIGIN}/?sat=25544`, 'navigate'],
  ['KeepTrack API data', 'https://api.keeptrack.space/v4/sats/brief', 'cors'],
  ['settings file', `${ORIGIN}/settings/settingsOverride.js`, 'cors'],
  ['static asset', `${ORIGIN}/textures/earthmap.jpg`, 'cors'],
  ['other same-origin file', `${ORIGIN}/js/main.js`, 'cors'],
];

describe('serviceWorker fetch handler', () => {
  let unhandled: unknown[];
  const onUnhandled = (reason: unknown) => unhandled.push(reason);

  beforeEach(() => {
    // The shared setup installs fake timers; the worker's fetch timeout and settle() need real ones.
    vi.useRealTimers();
    unhandled = [];
    process.on('unhandledRejection', onUnhandled);
  });

  afterEach(() => {
    process.off('unhandledRejection', onUnhandled);
  });

  it.each(ROUTES)('%s: serves the network response and caches it', async (_label, url, mode) => {
    const sw = loadWorker({});
    const res = await sw.handle(url, mode);

    await settle();
    expect(res?.status).toBe(200);
    expect(await res?.text()).toBe('fresh');
    expect(sw.puts).toHaveLength(1);
  });

  it.each(ROUTES)('%s: a failed cache write (quota full) neither breaks the response nor leaks a rejection', async (_label, url, mode) => {
    const sw = loadWorker({ putRejects: true });
    const res = await sw.handle(url, mode);

    await settle();
    expect(res?.status).toBe(200);
    expect(sw.puts).toHaveLength(1);
    expect(unhandled).toEqual([]);
  });

  it('serves the offline page for a navigation with no network and no cached copy', async () => {
    const res = await loadWorker({ networkFails: true }).handle(`${ORIGIN}/`, 'navigate');

    expect(res?.status).toBe(503);
    expect(await res?.text()).toContain('You are offline');
  });

  it('serves the cached copy of API data when offline', async () => {
    const res = await loadWorker({ networkFails: true, cached: new Response('cached', { status: 200 }) }).handle('https://api.keeptrack.space/v4/sats/brief');

    expect(await res?.text()).toBe('cached');
  });

  it('leaves analytics, the dev reload stream and non-GET requests to the browser', () => {
    const sw = loadWorker({});

    expect(sw.handle('https://www.google-analytics.com/g/collect')).toBeUndefined();
    expect(sw.handle(`${ORIGIN}/__reload`)).toBeUndefined();
    expect(sw.handle(`${ORIGIN}/js/main.js`, 'cors', 'POST')).toBeUndefined();
  });
});
