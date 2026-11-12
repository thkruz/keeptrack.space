const currentCacheName = 'KeepTrack-vX.X.X';
// Patched by build/lib/version-manager.ts on every build so the SW file bytes
// change between deploys. Guarantees the browser detects an update and the
// existing controllerchange listener in index.html auto-reloads clients.
const BUILD_ID = '__BUILD_ID__';

const OFFLINE_HTML =
  '<!DOCTYPE html><html><head><title>KeepTrack - Offline</title></head>' +
  '<body style="background:#1f1f1f;color:#ccc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">' +
  '<div style="text-align:center"><h1>You are offline</h1><p>Please reconnect and refresh the page.</p></div>' +
  '</body></html>';

// Flags to precache on install so they are available offline immediately.
// Country flag SVGs are inlined in the JS bundle; these are the custom org flags.
const PRECACHE_FLAGS = [
  '/img/arabsat.png',
  '/img/cis.png',
  '/img/esa.png',
  '/img/eu.png',
  '/img/eumetsat.png',
  '/img/eutelsat.png',
  '/img/inmarsat.png',
  '/img/intelsat.png',
  '/img/iss.png',
  '/img/nato.png',
  '/img/rascom.png',
  '/img/tbd.png',
  '/img/ussr.png',
];

// App shell: the HTML entry point. Hashed JS/CSS bundles are cached the first time they are
// requested (stale-while-revalidate below), so a visit that has loaded the app once runs offline.
const PRECACHE_SHELL = ['/', '/manifest.webmanifest'];

// Catalog files precached on install, best effort (a failure must not block the install).
const PRECACHE_CATALOG = [
  'https://api.keeptrack.space/v4/sats/brief',
  'https://r2.keeptrack.space/data/star-catalog.json',
  'https://r2.keeptrack.space/data/constellations.json',
  'https://r2.keeptrack.space/data/orgs.json',
];

// Staleness rule: the network always wins when it answers. A cached catalog copy is served only
// when the network request fails or times out, and every such response triggers a
// CATALOG_FROM_CACHE message carrying the copy's age so the page can show it. The page marks a
// copy older than 7 days as possibly out of date. Copies are replaced on every successful fetch.
const CACHED_AT_HEADER = 'x-kt-cached-at';

/**
 * Only public catalog data is cached under the API hosts. Everything else on those hosts
 * (Pro sign-in, token refresh, account sync, user data) is never intercepted, so it is never
 * stored. Requests carrying credentials are never cached either.
 */
function isCatalogRequest(url, request) {
  if (request && request.headers && request.headers.has('Authorization')) {
    return false;
  }
  if (url.hostname === 'api.keeptrack.space') {
    return url.pathname.startsWith('/v4/sats') || url.pathname.startsWith('/v4/satcat') || url.pathname.startsWith('/v4/r2/');
  }
  if (url.hostname === 'r2.keeptrack.space') {
    return url.pathname.startsWith('/data/');
  }
  if (url.hostname === 'app.keeptrack.space') {
    return url.pathname.startsWith('/tle/');
  }

  return false;
}

/** A response is storable when it is complete and not marked private or uncacheable. */
function isStorableCatalogResponse(response) {
  if (!response.ok || response.status === 206) {
    return false;
  }
  const cc = (response.headers.get('Cache-Control') || '').toLowerCase();

  return !/no-store|private/u.test(cc) && !response.headers.has('Set-Cookie');
}

/** Copies a response and stamps it with the time it was stored. */
function stampResponse(response, now) {
  return response.blob().then((body) => {
    const headers = new Headers(response.headers);

    headers.set(CACHED_AT_HEADER, String(now));

    return new Response(body, { status: response.status, statusText: response.statusText, headers });
  });
}

function cacheCatalogResponse(request, response) {
  return stampResponse(response, Date.now())
    .then((stamped) => caches.open(currentCacheName).then((cache) => cache.put(request, stamped)))
    .catch(() => undefined);
}

function notifyCatalogFromCache(cached) {
  const cachedAt = Number(cached.headers.get(CACHED_AT_HEADER));

  if (!cachedAt || !self.clients) {
    return Promise.resolve();
  }

  return self.clients
    .matchAll({ type: 'window' })
    .then((clients) => clients.forEach((client) => client.postMessage({ type: 'CATALOG_FROM_CACHE', cachedAt })))
    .catch(() => undefined);
}

function precacheCatalog(cache) {
  return Promise.allSettled(
    PRECACHE_CATALOG.map((href) =>
      fetchWithTimeout(new Request(href), 15000).then((response) => {
        if (!isStorableCatalogResponse(response)) {
          return undefined;
        }

        return stampResponse(response, Date.now()).then((stamped) => cache.put(href, stamped));
      }),
    ),
  );
}

// Install: precache shell and flags (required), catalog (best effort), then wait for explicit
// activation signal from the page
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(currentCacheName).then((cache) =>
      cache
        .addAll(PRECACHE_FLAGS)
        .then(() => Promise.allSettled(PRECACHE_SHELL.map((path) => cache.add(path))))
        .then(() => precacheCatalog(cache)),
    ),
  );
  // Do NOT call skipWaiting() here — let the page control when to activate
  // so in-flight requests from the old cache are not disrupted mid-session.
});

// Listen for skip-waiting message from the page
self.addEventListener('message', (event) => {
  // Verify the message origin matches our service worker's origin
  if (event.origin !== self.location.origin) {
    return;
  }
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Activate: purge old version caches.
// Do NOT call clients.claim() — let clients pick up the new SW on next
// navigation.  Claiming mid-session can swap the fetch handler while the
// page is still loading, which causes hangs when cached assets are stale.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(cacheNames.filter((name) => name !== currentCacheName && name.startsWith('KeepTrack-')).map((name) => caches.delete(name))),
      ),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') {
    return;
  }

  const url = new URL(e.request.url);

  // Skip analytics/tracking
  if (url.hostname.includes('google') || url.hostname.includes('zaraz')) {
    return;
  }

  // Skip dev server SSE endpoint
  if (url.pathname === '/__reload') {
    return;
  }

  // --- Navigation: network-first with timeout, cache under '/' so all query-param variants share one entry ---
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetchWithTimeout(e.request, 4000)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();

            caches.open(currentCacheName).then((cache) => cache.put('/', clone)).catch(() => undefined);
          }

          return response;
        })
        .catch(() =>
          caches.match('/').then((cached) => cached || new Response(OFFLINE_HTML, { status: 503, headers: { 'Content-Type': 'text/html' } })),
        ),
    );

    return;
  }

  // --- KeepTrack catalog data (TLE, stars, constellations, orgs): network-first with cache fallback ---
  // On an online visit the SW stores these public files. Offline, the cached copy is served and
  // the page is told how old it is. Other requests to the API hosts (auth, account, user data)
  // fall through to the browser untouched and are never cached.
  if (isCatalogRequest(url, e.request)) {
    e.respondWith(
      fetchWithTimeout(e.request, 8000)
        .then((response) => {
          if (isStorableCatalogResponse(response)) {
            e.waitUntil(cacheCatalogResponse(e.request, response.clone()));
          }

          return response;
        })
        .catch((err) =>
          caches.match(e.request).then((cached) => {
            if (cached) {
              return notifyCatalogFromCache(cached).then(() => cached);
            }
            throw err;
          }),
        ),
    );

    return;
  }

  // Skip other cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // --- Settings files: network-first so profile overrides apply immediately,
  //     with cache fallback for offline. settingsOverride.js controls runtime
  //     flags (isAutoStart, plugin enables, data sources) and must never be stale.
  if (url.pathname.startsWith('/settings/')) {
    e.respondWith(
      fetchWithTimeout(e.request, 4000)
        .then((response) => {
          if (response.ok && response.status !== 206) {
            const clone = response.clone();

            caches.open(currentCacheName).then((cache) => cache.put(e.request, clone)).catch(() => undefined);
          }

          return response;
        })
        .catch(() => caches.match(e.request).then((cached) => cached || new Response('', { status: 504, statusText: 'Gateway Timeout' }))),
    );

    return;
  }

  // --- Static assets (textures, meshes, images, fonts, audio): cache-first ---
  if (isStaticAsset(url)) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) {
          return cached;
        }

        return fetch(e.request).then((response) => {
          if (response.ok && response.status !== 206) {
            const clone = response.clone();

            caches.open(currentCacheName).then((cache) => cache.put(e.request, clone)).catch(() => undefined);
          }

          return response;
        });
      }),
    );

    return;
  }

  // --- Everything else (JS, CSS, workers, data): stale-while-revalidate ---
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fresh = fetch(e.request)
        .then((response) => {
          if (response.ok && response.status !== 206) {
            const clone = response.clone();

            caches.open(currentCacheName).then((cache) => cache.put(e.request, clone)).catch(() => undefined);
          }

          return response;
        })
        .catch(() => {
          if (cached) {
            return cached;
          }

          return new Response('', { status: 504, statusText: 'Gateway Timeout' });
        });

      return cached || fresh;
    }),
  );
});

function fetchWithTimeout(request, ms) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);

  return fetch(request, { signal: controller.signal }).finally(() => clearTimeout(id));
}

function isStaticAsset(url) {
  const path = url.pathname;

  return (
    path.startsWith('/textures/') ||
    path.startsWith('/meshes/') ||
    path.startsWith('/img/') ||
    path.startsWith('/res/') ||
    path.startsWith('/simulation/') ||
    /\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot|otf|mp3|wav|flac|m4a|obj|mtl|wasm)$/iu.test(path)
  );
}

// Test hook: lets unit tests load this file in a plain module context (no effect in a worker).
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { isCatalogRequest, isStorableCatalogResponse, stampResponse, CACHED_AT_HEADER };
}
