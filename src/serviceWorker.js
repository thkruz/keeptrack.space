var currentCacheName = 'KeepTrack-v2.8.1';
var contentToCache = ['./'];

// ////////////////////////////////////////////////////////////////////////////
// Auto-install
// ////////////////////////////////////////////////////////////////////////////
self.addEventListener('install', (e) => {
  console.debug(`[Service Worker] Installing...`);
  e.waitUntil(
    caches
      .open(currentCacheName)
      .then((cache) => {
        console.debug(`[Service Worker] Caching all: app shell and content`);
        return cache.addAll(contentToCache);
      })
      .then(function (e) {
        // return self.skipWaiting();
      })
  );
  // return self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  if (e.request.url.startsWith('https://www.google-')) return; // Skip Google Stuff
  if (e.request.url.startsWith('https://www.googletagmanager.com')) return; // Skip Google Stuff
  if (e.request.url.startsWith('https://launchlibrary.net')) return; // Skip External
  e.respondWith(
    caches.match(e.request).then((r) => {
      console.debug(`[Service Worker] Fetching resource: ${e.request.url}`);
      return (
        r ||
        fetch(e.request).then((response) => {
          if (!response.ok) console.debug(`[Service Worker] Resource not found: ${e.request.url}`);
          return caches.open(currentCacheName).then((cache) => {
            console.debug(`[Service Worker] Caching new resource: ${e.request.url}`);
            cache.put(e.request, response.clone());
            return response;
          });
        })
      );
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          if (cacheName !== currentCacheName && cacheName.startsWith('KeepTrack-')) {
            console.debug(`[Service Worker] Removing Old Cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
