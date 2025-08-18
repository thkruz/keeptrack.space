(function () {
  const TLE_URL = '../public/tle/TLE.txt';

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
      return { type: 'point', x: longitude * rad2deg, y: latitude * rad2deg, z: heightKm * 1000, spatialReference: { wkid: 4326 } };
    } catch (e) { return null; }
  }

  function start() {
    require(['esri/Map','esri/views/SceneView','esri/layers/GraphicsLayer','esri/Graphic'],
      function (Map, SceneView, GraphicsLayer, Graphic) {
        const map = new Map({ basemap: 'satellite', ground: 'world-elevation' });
        const view = new SceneView({ container: 'viewDiv', map, qualityProfile: 'high', constraints: { altitude: { max: 12000000000 } }, popup: { dockEnabled: true, dockOptions: { breakpoint: false } } });
        const satLayer = new GraphicsLayer();
        const trackLayer = new GraphicsLayer();
        map.addMany([satLayer, trackLayer]);

        const graphics = [];

        function addSatGraphic(s) {
          const pt = getSatPointFromTle(new Date(), s.tle1, s.tle2);
          if (!pt) return;
          const g = new Graphic({ geometry: pt, symbol: { type: 'picture-marker', url: 'https://i.ibb.co/0y1d3Zk/Sat-PNG.png', width: 12, height: 12 }, attributes: { name: s.name || 'SAT', tle1: s.tle1, tle2: s.tle2 }, popupTemplate: { title: '{name}', content: 'TLE Object', actions: [{ title: 'Show Track (24h)', id: 'track', className: 'esri-icon-globe' }] } });
          satLayer.add(g);
          graphics.push(g);
        }

        function updatePositions() {
          const now = new Date();
          for (let i = 0; i < graphics.length; i++) {
            const g = graphics[i];
            const pt = getSatPointFromTle(now, g.attributes.tle1, g.attributes.tle2);
            if (pt) g.geometry = pt;
          }
        }

        function drawTrack(g) {
          trackLayer.removeAll();
          const points = [];
          const base = new Date();
          for (let i = 0; i < 60 * 24; i++) {
            const t = new Date(base.getTime() + i * 60000);
            const pt = getSatPointFromTle(t, g.attributes.tle1, g.attributes.tle2);
            if (pt) points.push([pt.x, pt.y, pt.z]);
          }
          if (points.length > 1) {
            const line = new Graphic({ geometry: { type: 'polyline', paths: [points], spatialReference: { wkid: 4326 } }, symbol: { type: 'line-3d', symbolLayers: [{ type: 'line', size: 2, material: { color: [200,200,200,0.6] } }] } });
            trackLayer.add(line);
          }
        }

        view.popup.watch('selectedFeature', function () { trackLayer.removeAll(); });
        view.popup.on('trigger-action', function (evt) { if (evt.action.id === 'track' && view.popup.selectedFeature) drawTrack(view.popup.selectedFeature); });

        fetch(TLE_URL).then(r => r.ok ? r.text() : Promise.reject()).then((txt) => {
          const sats = parseAsciiTle(txt);
          sats.slice(0, 1000).forEach(addSatGraphic);
          setInterval(updatePositions, 1000);
        });
      });
  }

  if (window.require && window.require.toUrl) start();
  else {
    const iv = setInterval(function(){ if (window.require && window.require.toUrl){ clearInterval(iv); start(); } }, 50);
  }
})();

