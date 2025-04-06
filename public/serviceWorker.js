const currentCacheName = 'KeepTrack-v8.1.1';
const contentToCache = ['./'];

// Auto-install
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(currentCacheName).then((cache) => cache.addAll(contentToCache)));
});

self.addEventListener('fetch', (e) => {
  if (e.request.url.startsWith('https://www.google-')) {
    return;
  } // Skip Google Stuff
  if (e.request.url.startsWith('https://www.googletagmanager.com')) {
    return;
  } // Skip Google Stuff
  if (e.request.url.startsWith('https://launchlibrary.net')) {
    return;
  } // Skip External
  e.respondWith(
    caches.match(e.request).then(
      (r) =>
        r ||
        fetch(e.request).then((response) =>
          caches.open(currentCacheName).then((cache) => {
            cache.put(e.request, response.clone());

            return response;
          }),
        ),
    ),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(cacheNames.filter((cacheName) => cacheName !== currentCacheName && cacheName.startsWith('KeepTrack-')).map((cacheName) => caches.delete(cacheName))),
      ),
  );
});
