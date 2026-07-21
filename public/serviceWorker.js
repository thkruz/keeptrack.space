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

// Install: precache flags, then wait for explicit activation signal from the page
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(currentCacheName).then((cache) => cache.addAll(PRECACHE_FLAGS)),
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

            caches.open(currentCacheName).then((cache) => cache.put('/', clone));
          }

          return response;
        })
        .catch(() =>
          caches.match('/').then((cached) => cached || new Response(OFFLINE_HTML, { status: 503, headers: { 'Content-Type': 'text/html' } })),
        ),
    );

    return;
  }

  // --- KeepTrack API data (TLE, stars, covariance): network-first with cache fallback ---
  // On first online visit the SW caches these responses. Offline, the cached copy is served
  // so the app never needs to fall back to local /tle/ files.
  if (url.hostname === 'api.keeptrack.space' || url.hostname === 'r2.keeptrack.space' || url.hostname === 'app.keeptrack.space') {
    e.respondWith(
      fetchWithTimeout(e.request, 8000)
        .then((response) => {
          if (response.ok && response.status !== 206) {
            const clone = response.clone();

            caches.open(currentCacheName).then((cache) => cache.put(e.request, clone));
          }

          return response;
        })
        .catch((err) =>
          caches.match(e.request).then((cached) => {
            if (cached) {
              return cached;
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

            caches.open(currentCacheName).then((cache) => cache.put(e.request, clone));
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

            caches.open(currentCacheName).then((cache) => cache.put(e.request, clone));
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

            caches.open(currentCacheName).then((cache) => cache.put(e.request, clone));
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
