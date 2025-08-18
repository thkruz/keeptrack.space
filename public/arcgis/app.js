(function () {
  const ARCGIS_VERSION = '4.29';
  const MAX_ALTITUDE_METERS = 12000000000;
  const SAT_ICON_URL = 'https://i.ibb.co/0y1d3Zk/Sat-PNG.png';
  const TLE_URL = '../tle/TLE.txt';

  function parseAsciiTle(text) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const sats = [];
    for (let i = 0; i < lines.length - 1; i++) {
      const l1 = lines[i];
      const l2 = lines[i + 1];
      if (l1.startsWith('1 ') && l2 && l2.startsWith('2 ')) {
        sats.push({ tle1: l1, tle2: l2 });
        i += 1;
      } else if (!l1.startsWith('1 ') && lines[i + 1] && lines[i + 1].startsWith('1 ') && lines[i + 2] && lines[i + 2].startsWith('2 ')) {
        sats.push({ name: l1, tle1: lines[i + 1], tle2: lines[i + 2] });
        i += 2;
      }
    }
    return sats;
  }

  function getSatPointFromTle(date, tle1, tle2) {
    try {
      const satrec = satellite.twoline2satrec(tle1, tle2);
      const pv = satellite.propagate(
        satrec,
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds()
      );
      const positionEci = pv.position;
      if (!positionEci) return null;
      const gmst = satellite.gstime(date);
      const positionGd = satellite.eciToGeodetic(positionEci, gmst);
      if (!positionGd) return null;
      let longitude = positionGd.longitude;
      const latitude = positionGd.latitude;
      const heightKm = positionGd.height;
      if ([longitude, latitude, heightKm].some((v) => Number.isNaN(v))) return null;
      const rad2deg = 180 / Math.PI;
      while (longitude < -Math.PI) longitude += 2 * Math.PI;
      while (longitude > Math.PI) longitude -= 2 * Math.PI;
      return {
        type: 'point',
        x: longitude * rad2deg,
        y: latitude * rad2deg,
        z: heightKm * 1000,
        spatialReference: { wkid: 4326 }
      };
    } catch (e) {
      return null;
    }
  }

  function createTrackPolyline(pointsLngLatZ) {
    return {
      type: 'polyline',
      paths: [pointsLngLatZ],
      spatialReference: { wkid: 4326 }
    };
  }

  function start() {
    require([
      'esri/Map',
      'esri/views/SceneView',
      'esri/layers/GraphicsLayer',
      'esri/Graphic',
      'esri/core/promiseUtils'
    ], function (Map, SceneView, GraphicsLayer, Graphic, promiseUtils) {
      const map = new Map({ basemap: 'satellite', ground: 'world-elevation' });

      const view = new SceneView({
        container: 'viewDiv',
        map: map,
        qualityProfile: 'high',
        constraints: {
          altitude: { max: MAX_ALTITUDE_METERS }
        },
        environment: {
          lighting: { date: new Date(), directShadowsEnabled: false },
          atmosphereEnabled: true,
          starsEnabled: true
        },
        popup: {
          dockEnabled: true,
          dockOptions: { breakpoint: false }
        }
      });

      const satelliteLayer = new GraphicsLayer();
      const tracksLayer = new GraphicsLayer();
      map.addMany([satelliteLayer, tracksLayer]);

      const graphics = [];
      const satData = [];
      let worker = null;

      function addSatGraphic(sat) {
        const now = new Date();
        const pt = getSatPointFromTle(now, sat.tle1, sat.tle2);
        if (!pt) return;
        const g = new Graphic({
          geometry: pt,
          symbol: {
            type: 'picture-marker',
            url: SAT_ICON_URL,
            width: 12,
            height: 12
          },
          attributes: {
            name: sat.name || 'SAT',
            id: graphics.length,
            tle1: sat.tle1,
            tle2: sat.tle2,
            t0: Date.now()
          },
          popupTemplate: {
            title: '{name}',
            content: 'TLE-tracked object',
            actions: [{ title: 'Show Track (24h)', id: 'track', className: 'esri-icon-globe' }]
          }
        });
        satelliteLayer.add(g);
        graphics.push(g);
      }

      function updatePositionsCpu() {
        const now = new Date();
        for (let i = 0; i < graphics.length; i++) {
          const g = graphics[i];
          const pt = getSatPointFromTle(now, g.attributes.tle1, g.attributes.tle2);
          if (pt) g.geometry = pt;
        }
      }

      function drawTrackForGraphic(graphic) {
        if (!worker) {
          // Fallback to CPU if worker not available
          tracksLayer.removeAll();
          const positions = [];
          const minutes = 60 * 24;
          const startTime = new Date();
          for (let i = 0; i < minutes; i++) {
            const t = new Date(startTime.getTime() + i * 60 * 1000);
            const pt = getSatPointFromTle(t, graphic.attributes.tle1, graphic.attributes.tle2);
            if (pt) positions.push([pt.x, pt.y, pt.z]);
          }
          if (positions.length > 1) {
            const line = new Graphic({
              geometry: createTrackPolyline(positions),
              symbol: { type: 'line-3d', symbolLayers: [{ type: 'line', size: 2, material: { color: [192, 192, 192, 0.6] } }] }
            });
            tracksLayer.add(line);
          }
          return;
        }

        tracksLayer.removeAll();
        worker.postMessage({ type: 'track', id: graphic.attributes.id });
      }

      view.popup.watch('selectedFeature', function () { tracksLayer.removeAll(); });
      view.popup.on('trigger-action', function (event) {
        if (event.action.id === 'track' && view.popup.selectedFeature) {
          drawTrackForGraphic(view.popup.selectedFeature);
        }
      });

      fetch(TLE_URL)
        .then((r) => r.ok ? r.text() : Promise.reject(new Error('Failed to load TLE.txt')))
        .then((text) => {
          const sats = parseAsciiTle(text);
          // Keep it light for demo: add first N satellites
          const MAX_SATS = 1000; // adjust as needed
          const subset = sats.slice(0, MAX_SATS);
          subset.forEach(addSatGraphic);

          // Initialize worker
          try {
            worker = new Worker('./worker.js');
            // Seed worker with TLEs
            const payload = subset.map((s, idx) => ({ id: idx, name: s.name || 'SAT', tle1: s.tle1, tle2: s.tle2 }));
            worker.postMessage({ type: 'init', payload });

            worker.onmessage = function(ev) {
              const data = ev.data || {};
              if (data.type === 'positions' && data.positions && data.positions.buffer) {
                const arr = new Float32Array(data.positions);
                for (let i = 0; i < graphics.length; i++) {
                  const j = i * 3;
                  const x = arr[j];
                  const y = arr[j + 1];
                  const z = arr[j + 2];
                  if (!Number.isNaN(x) && !Number.isNaN(y) && !Number.isNaN(z)) {
                    graphics[i].geometry = { type: 'point', x, y, z, spatialReference: { wkid: 4326 } };
                  }
                }
              } else if (data.type === 'track' && data.positions) {
                const arr = new Float32Array(data.positions);
                const path = [];
                for (let k = 0; k < arr.length; k += 3) {
                  const x = arr[k];
                  const y = arr[k + 1];
                  const z = arr[k + 2];
                  if (!Number.isNaN(x) && !Number.isNaN(y) && !Number.isNaN(z)) path.push([x, y, z]);
                }
                if (path.length > 1) {
                  const line = new Graphic({ geometry: createTrackPolyline(path), symbol: { type: 'line-3d', symbolLayers: [{ type: 'line', size: 2, material: { color: [192,192,192,0.6] } }] } });
                  tracksLayer.add(line);
                }
              }
            };

            // Drive updates via worker
            setInterval(function() {
              if (worker) worker.postMessage({ type: 'tick', time: Date.now() });
            }, 1000);
          } catch (e) {
            // Fallback to CPU updates if worker creation fails
            setInterval(updatePositionsCpu, 1000);
          }
        })
        .catch((e) => console.error(e));
    });
  }

  if (window.require && window.require.toUrl) {
    start();
  } else {
    // Wait for ArcGIS script
    const check = setInterval(function () {
      if (window.require && window.require.toUrl) {
        clearInterval(check);
        start();
      }
    }, 50);
  }
})();

