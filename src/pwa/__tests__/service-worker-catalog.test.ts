import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

type Handler = (e: unknown) => void;

const source = fs.readFileSync(path.resolve(__dirname, '../../../public/serviceWorker.js'), 'utf8');

/** Runs the real service worker file in a sandbox with a fake cache, network and client list. */
const loadWorker = (opts: { network?: (req: Request) => Promise<Response> } = {}) => {
  const handlers: Record<string, Handler> = {};
  const store = new Map<string, Response>();
  const posted: unknown[] = [];
  const keyOf = (r: Request | string) => (typeof r === 'string' ? r : r.url);
  const cache = {
    put: vi.fn(async (r: Request | string, res: Response) => void store.set(keyOf(r), res)),
    add: vi.fn(async () => undefined),
    addAll: vi.fn(async () => undefined),
  };
  const sandbox: Record<string, unknown> = {
    self: {
      addEventListener: (type: string, h: Handler) => (handlers[type] = h),
      location: { origin: 'https://app.keeptrack.space' },
      clients: { matchAll: async () => [{ postMessage: (m: unknown) => posted.push(m) }] },
    },
    caches: {
      open: async () => cache,
      match: async (r: Request | string) => store.get(keyOf(r)),
      keys: async () => [],
    },
    fetch: opts.network ?? (async () => new Response('x')),
    module: { exports: {} },
    Headers,
    Response,
    Request,
    URL,
    AbortController,
    setTimeout,
    clearTimeout,
    Promise,
    Number,
    Date,
  };

  vm.runInNewContext(source, sandbox);

  return { handlers, store, posted, cache, api: (sandbox.module as { exports: Record<string, (...a: unknown[]) => unknown> }).exports };
};

const fetchEvent = (url: string, headers: Record<string, string> = {}) => {
  const respondWith = vi.fn();
  const waits: Promise<unknown>[] = [];

  return { respondWith, waits, event: { request: new Request(url, { headers }), respondWith, waitUntil: (p: Promise<unknown>) => waits.push(p) } };
};

describe('service worker catalog caching', () => {
  it('treats only public catalog paths as cacheable', () => {
    const { api } = loadWorker();
    const is = (u: string, h?: Record<string, string>) => api.isCatalogRequest(new URL(u), new Request(u, { headers: h })) as boolean;

    expect(is('https://api.keeptrack.space/v4/sats/brief')).toBe(true);
    expect(is('https://r2.keeptrack.space/data/orgs.json')).toBe(true);
    expect(is('https://app.keeptrack.space/tle/TLEdebris.json')).toBe(true);
    // Pro auth, token refresh, account and user data are never cached
    expect(is('https://api.keeptrack.space/v1/auth/token')).toBe(false);
    expect(is('https://api.keeptrack.space/v1/user/sync')).toBe(false);
    expect(is('https://api.keeptrack.space/v4/sats/brief', { Authorization: 'Bearer abc' })).toBe(false);
  });

  it('does not store private or no-store responses', () => {
    const { api } = loadWorker();
    const ok = (h: Record<string, string>) => api.isStorableCatalogResponse(new Response('x', { headers: h })) as boolean;

    expect(ok({})).toBe(true);
    expect(ok({ 'Cache-Control': 'private' })).toBe(false);
    expect(ok({ 'Cache-Control': 'no-store' })).toBe(false);
  });

  it('never intercepts an auth request on the API host', () => {
    const w = loadWorker();
    const { respondWith, event } = fetchEvent('https://api.keeptrack.space/v1/auth/token');

    w.handlers.fetch(event);
    expect(respondWith).not.toHaveBeenCalled();
    expect(w.store.size).toBe(0);
  });

  it('stamps and stores a catalog response when online', async () => {
    const w = loadWorker({ network: async () => new Response('[]') });
    const { respondWith, waits, event } = fetchEvent('https://api.keeptrack.space/v4/sats/brief');

    w.handlers.fetch(event);
    await respondWith.mock.calls[0][0];
    await Promise.all(waits);
    const stored = w.store.get('https://api.keeptrack.space/v4/sats/brief');

    expect(Number(stored?.headers.get('x-kt-cached-at'))).toBeGreaterThan(0);
  });

  it('serves the cached copy offline and tells the page how old it is', async () => {
    const w = loadWorker({
      network: async () => {
        throw new TypeError('offline');
      },
    });
    const cachedAt = Date.now() - 86_400_000;

    w.store.set('https://api.keeptrack.space/v4/sats/brief', new Response('[1]', { headers: { 'x-kt-cached-at': String(cachedAt) } }));
    const { respondWith, event } = fetchEvent('https://api.keeptrack.space/v4/sats/brief');

    w.handlers.fetch(event);
    const res = (await respondWith.mock.calls[0][0]) as Response;

    expect(await res.text()).toBe('[1]');
    expect(w.posted).toEqual([{ type: 'CATALOG_FROM_CACHE', cachedAt }]);
  });

  it('precaches the shell and the catalog on install, and a catalog failure does not fail install', async () => {
    const w = loadWorker({
      network: async () => {
        throw new TypeError('offline');
      },
    });
    let done: Promise<unknown> = Promise.resolve();

    w.handlers.install({ waitUntil: (p: Promise<unknown>) => (done = p) });
    await expect(done).resolves.toBeDefined();
    expect(w.cache.add).toHaveBeenCalledWith('/');
  });

  it('stores precached catalog files with an age stamp', async () => {
    const w = loadWorker({ network: async () => new Response('{}') });
    let done: Promise<unknown> = Promise.resolve();

    w.handlers.install({ waitUntil: (p: Promise<unknown>) => (done = p) });
    await done;
    expect(w.store.get('https://api.keeptrack.space/v4/sats/brief')?.headers.get('x-kt-cached-at')).toBeTruthy();
    expect(w.store.has('https://r2.keeptrack.space/data/star-catalog.json')).toBe(true);
  });
});
