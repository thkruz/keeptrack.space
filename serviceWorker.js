var cacheName = 'KeepTrack-v1.20.8';
var contentToCache = [
    './',
    './index.htm',
    './css/fonts/nasalization-rg.woff2',
    './js/keeptrack-head.js',
    './js/checker-script.js',
    './images/share-icon.png',
    './images/layers-icon.png',
    './images/help.png',
    './images/fullscreen-icon.png',
    './js/lib/jquery.min.js',
    './js/keeptrack-foot.js',
    './textures/earthmap4k.jpg',
    './textures/earthlights4k.jpg',
    './textures/earthbump8k.jpg',
    './textures/earthspec8k.jpg',
    './css/fonts.css?v=1.20.8',
    './css/loading-screen.css?v=1.20.8',
    './css/materialize.css?v=1.20.8',
    './css/materialize-local.css?v=1.20.8',
    './js/lib/colorPick.css?v=1.20.8',
    './modules/nextLaunchManager.css?v=1.20.8',
    './css/perfect-scrollbar.min.css?v=1.20.8',
    './css/jquery-ui.min.css?v=1.20.8',
    './css/jquery-ui-timepicker-addon.css?v=1.20.8',
    './css/style.css?v=1.20.8',
    './css/responsive.css?v=1.20.8',
    './css/fonts/opensans.woff',
    './js/lib/colorPick.js?v=1.20.8',
    './js/lib/webgl-obj-loader.min.js?v=1.20.8',
    './js/mapManager.min.js?v=1.20.8',
    './js/lib/combinedDependencies.js?v=1.20.8',
    './modules/meshManager.min.js?v=1.20.8',
    './modules/sensorManager.min.js?v=1.20.8',
    './modules/controlSiteManager.js?v=1.20.8',
    './modules/launchSiteManager.js?v=1.20.8',
    './modules/nextLaunchManager.min.js?v=1.20.8',
    './modules/starManager.min.js?v=1.20.8',
    './modules/satLinkManager.min.js?v=1.20.8',
    './js/lib/CanvasRecorder.min.js?v=1.20.8',
    './modules/satVmagManager.js?v=1.20.8',
    './js/sceneManager.js?v=1.20.8',
    './js/timeManager.min.js?v=1.20.8',
    './js/groups.js?v=1.20.8',
    './js/lookangles.min.js?v=1.20.8',
    './js/satSet.js?v=1.20.8',
    './js/objectManager.js?v=1.20.8',
    './js/color-scheme.min.js?v=1.20.8',
    './js/mobile.min.js?v=1.20.8',
    './modules/missileManager.js?v=1.20.8',
    './js/ui.min.js?v=1.20.8',
    './js/main.min.js?v=1.20.8',
    './js/orbitManager.min.js?v=1.20.8',
    './js/drawLoop-shapes.min.js?v=1.20.8',
    './js/search-box.min.js?v=1.20.8',
    './js/vector-to-kepler.min.js?v=1.20.8',
    './js/lib/uiCombinedDependencies.js?v=1.20.8',
    './js/advice-module.min.js?v=1.20.8',
    './css/fonts/droid/droid-sans-v6-latin-regular.woff2',
    './js/objectManager.js',
    './license/license.min.js?v=1.20.8',
    './js/sat-cruncher.js',
    './tle/TLE.json',
    './js/orbit-calculation-worker.js',
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

self.addEventListener('install', (e) => {
    console.log('[Service Worker] Install');
    e.waitUntil(
        caches.open(cacheName).then((cache) => {
            // console.log(
            //     '[Service Worker] Caching all: app shell and content'
            // );
            return cache.addAll(contentToCache);
        }).then(function(e){
        return self.skipWaiting();
      })
    );
    // return self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((r) => {
            // console.log(
            //     '[Service Worker] Fetching resource: ' + e.request.url
            // );
            return (
                r ||
                fetch(e.request).then((response) => {
                    if (!response.ok) console.log('NOT FOUND!');
                    return caches.open(cacheName).then((cache) => {
                        // console.log(
                        //     '[Service Worker] Caching new resource: ' +
                        //         e.request.url
                        // );
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
          if (CACHE_NAME !== cacheName &&  cacheName.startsWith("KeepTrack-")) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
