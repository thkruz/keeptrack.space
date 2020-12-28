var currentCacheName = 'KeepTrack-v2.8.1';
var contentToCache = [
    './',
    './index.htm',
    './css/fonts/nasalization-rg.woff2',
    './js/keeptrack-head.js',
    './js/checker-script.js',
    './img/share-icon.png',
    './img/layers-icon.png',
    './img/help.png',
    './img/fullscreen-icon.png',
    './js/lib/jquery.min.js',
    './js/keeptrack-foot.js',
    './textures/earthmap4k.jpg',
    './textures/earthlights4k.jpg',
    './textures/earthbump8k.jpg',
    './textures/earthspec8k.jpg',
    './css/fonts.css?v=2.8.1',
    './css/loading-screen.css?v=2.8.1',
    './css/materialize.css?v=2.8.1',
    './css/materialize-local.css?v=2.8.1',
    './js/lib/colorPick.css?v=2.8.1',
    './modules/nextLaunchManager.css?v=2.8.1',
    './css/perfect-scrollbar.min.css?v=2.8.1',
    './css/jquery-ui.min.css?v=2.8.1',
    './css/jquery-ui-timepicker-addon.css?v=2.8.1',
    './css/style.css?v=2.8.1',
    './css/responsive.css?v=2.8.1',
    './css/fonts/opensans.woff',
    './js/lib/colorPick.js?v=2.8.1',
    './js/lib/webgl-obj-loader.min.js?v=2.8.1',
    './js/mapManager.min.js?v=2.8.1',
    './js/lib/combinedDependencies.js?v=2.8.1',
    './modules/meshManager.min.js?v=2.8.1',
    './modules/sensorManager.min.js?v=2.8.1',
    './modules/controlSiteManager.js?v=2.8.1',
    './modules/launchSiteManager.js?v=2.8.1',
    './modules/nextLaunchManager.min.js?v=2.8.1',
    './modules/starManager.min.js?v=2.8.1',
    './modules/satLinkManager.min.js?v=2.8.1',
    './js/lib/CanvasRecorder.min.js?v=2.8.1',
    './modules/satVmagManager.js?v=2.8.1',
    './js/sceneManager.js?v=2.8.1',
    './js/timeManager.min.js?v=2.8.1',
    './js/groups.js?v=2.8.1',
    './js/lookangles.min.js?v=2.8.1',
    './js/satSet.js?v=2.8.1',
    './js/objectManager.js?v=2.8.1',
    './js/color-scheme.min.js?v=2.8.1',
    './js/mobile.min.js?v=2.8.1',
    './modules/missileManager.js?v=2.8.1',
    './js/ui.min.js?v=2.8.1',
    './js/main.min.js?v=2.8.1',
    './js/orbitManager.min.js?v=2.8.1',
    './js/drawLoop-shapes.min.js?v=2.8.1',
    './js/search-box.min.js?v=2.8.1',
    './js/vector-to-kepler.min.js?v=2.8.1',
    './js/lib/uiCombinedDependencies.js?v=2.8.1',
    './js/advice-module.min.js?v=2.8.1',
    './css/fonts/droid/droid-sans-v6-latin-regular.woff2',
    './js/objectManager.js',
    './js/satCruncher.js',
    './tle/TLE.json',
    './js/orbit-calculation-worker.js',
    './offline/tle.js',
    './meshes/sat2.obj',
    './meshes/sat2.mtl',
    './meshes/s1u.obj',
    './meshes/s1u.mtl',
    './meshes/s2u.obj',
    './meshes/s2u.mtl',
    './meshes/s3u.obj',
    './meshes/s3u.mtl',
    './meshes/starlink.obj',
    './meshes/starlink.mtl',
    './meshes/iss.obj',
    './meshes/iss.mtl',
    './meshes/gps.obj',
    './meshes/gps.mtl',
    './meshes/aehf.obj',
    './meshes/aehf.mtl',
    './meshes/dsp.obj',
    './meshes/dsp.mtl',
    './meshes/galileo.obj',
    './meshes/galileo.mtl',
    './meshes/o3b.obj',
    './meshes/o3b.mtl',
    './meshes/orbcomm.obj',
    './meshes/orbcomm.mtl',
    './meshes/iridium.obj',
    './meshes/iridium.mtl',
    './meshes/globalstar.obj',
    './meshes/globalstar.mtl',
    './meshes/debris0.obj',
    './meshes/debris0.mtl',
    './meshes/debris1.obj',
    './meshes/debris1.mtl',
    './meshes/debris2.obj',
    './meshes/debris2.mtl',
    './meshes/rocketbody.obj',
    './meshes/rocketbody.mtl',
];

// ////////////////////////////////////////////////////////////////////////////
// Auto-install
// ////////////////////////////////////////////////////////////////////////////
self.addEventListener('install', (e) => {
    console.debug(`[Service Worker] Installing...`);
    e.waitUntil(
        caches.open(currentCacheName).then((cache) => {
          console.debug(`[Service Worker] Caching all: app shell and content`);
            return cache.addAll(contentToCache);
        }).then(function(e){
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

self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== currentCacheName && cacheName.startsWith("KeepTrack-")) {
            console.debug(`[Service Worker] Removing Old Cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
