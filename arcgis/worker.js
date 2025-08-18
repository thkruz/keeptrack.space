/* global self, importScripts */
(function() {
  try {
    importScripts('https://cdn.jsdelivr.net/npm/satellite.js@5.0.1/dist/satellite.min.js');
  } catch (e) {}

  let satRecords = [];

  function toLonLatHeight(positionEci, date) {
    try {
      const gmst = satellite.gstime(date);
      const gd = satellite.eciToGeodetic(positionEci, gmst);
      if (!gd) return null;
      let lon = gd.longitude;
      const lat = gd.latitude;
      const hKm = gd.height;
      if ([lon, lat, hKm].some((v) => Number.isNaN(v))) return null;
      const rad2deg = 180 / Math.PI;
      while (lon < -Math.PI) lon += 2 * Math.PI;
      while (lon > Math.PI) lon -= 2 * Math.PI;
      return [lon * rad2deg, lat * rad2deg, hKm * 1000];
    } catch (e) { return null; }
  }

  function handleInit(payload) {
    satRecords = [];
    for (let i = 0; i < payload.length; i++) {
      const s = payload[i];
      try {
        const rec = satellite.twoline2satrec(s.tle1, s.tle2);
        satRecords.push({ id: s.id, tle1: s.tle1, tle2: s.tle2, satrec: rec, name: s.name || 'SAT' });
      } catch (e) {}
    }
    self.postMessage({ type: 'inited', count: satRecords.length });
  }

  function handleTick(timeMs) {
    const date = new Date(timeMs);
    const n = satRecords.length;
    const positions = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const rec = satRecords[i];
      let out = [NaN, NaN, NaN];
      try {
        const pv = satellite.propagate(rec.satrec, date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
        if (pv && pv.position) {
          const p = toLonLatHeight(pv.position, date);
          if (p) out = p;
        }
      } catch (e) {}
      const j = i * 3;
      positions[j] = out[0];
      positions[j + 1] = out[1];
      positions[j + 2] = out[2];
    }
    self.postMessage({ type: 'positions', time: timeMs, positions }, [positions.buffer]);
  }

  function handleTrack(satId) {
    const rec = satRecords.find((s) => s.id === satId);
    if (!rec) { self.postMessage({ type: 'track', id: satId, positions: null }); return; }
    const minutes = 60 * 24;
    const start = new Date();
    const positions = new Float32Array(minutes * 3);
    let k = 0;
    for (let i = 0; i < minutes; i++) {
      const t = new Date(start.getTime() + i * 60000);
      let out = [NaN, NaN, NaN];
      try {
        const pv = satellite.propagate(rec.satrec, t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate(), t.getUTCHours(), t.getUTCMinutes(), t.getUTCSeconds());
        if (pv && pv.position) {
          const p = toLonLatHeight(pv.position, t);
          if (p) out = p;
        }
      } catch (e) {}
      positions[k++] = out[0];
      positions[k++] = out[1];
      positions[k++] = out[2];
    }
    self.postMessage({ type: 'track', id: satId, positions }, [positions.buffer]);
  }

  self.onmessage = function(ev) {
    const data = ev.data || {};
    if (data.type === 'init') handleInit(data.payload || []);
    else if (data.type === 'tick') handleTick(data.time || Date.now());
    else if (data.type === 'track') handleTrack(data.id);
  };
})();

