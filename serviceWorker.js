var cacheName = 'js13kPWA-v1';
var contentToCache = [
  '/',
  '/index.htm',
  '/tle/TLE.json',
  '/offline/tle.js'
];

// // run this in global scope of window or worker. since window.self = window, we're ok
// if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
//     // huzzah! a worker!
// } else {
//     // I'm a window... sad trombone.
// }

self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install');
  e.waitUntil(
    caches.open(cacheName).then((cache) => {
          console.log('[Service Worker] Caching all: app shell and content');
          console.log(contentToCache);
      return cache.addAll(contentToCache);
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((r) => {
      let url = e.request.url.split('?');
      e.request.url = url[0];
      console.log('[Service Worker] Fetching resource: '+ e.request.url);
      return r || fetch(e.request).then((response) => {
        if (!response.ok) console.log('NOT FOUND!');
        return caches.open(cacheName).then((cache) => {
          console.log('[Service Worker] Caching new resource: '+ e.request.url);
          cache.put(e.request, response.clone());
          return response;
        });
      });
    })
  );
});
