/* global self, importScripts */
(function () {
    const DEBUG = (typeof self !== 'undefined' && (self.location?.search || '').includes('debug=1'));
    // Load satellite.js in the worker context
    try {
        importScripts('https://cdn.jsdelivr.net/npm/satellite.js@6.0.0/dist/satellite.min.js');
    } catch (e) {
        // If CDN blocked, the main thread should fall back; for now we rely on CDN
    }

    /**
     * Internal state: array of { id, tle1, tle2, satrec }
     */
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
            // Normalize longitude to [-PI, PI]
            while (lon < -Math.PI) lon += 2 * Math.PI;
            while (lon > Math.PI) lon -= 2 * Math.PI;
            return [lon * rad2deg, lat * rad2deg, hKm * 1000];
        } catch (e) {
            return null;
        }
    }

    function handleInit(payload) {
        satRecords = [];
        for (let i = 0; i < payload.length; i++) {
            const s = payload[i];
            try {
                const rec = satellite.twoline2satrec(s.tle1, s.tle2);
                satRecords.push({ id: s.id, tle1: s.tle1, tle2: s.tle2, satrec: rec, name: s.name || 'SAT' });
            } catch (e) {
                // Skip bad entries
            }
        }
        if (DEBUG) try { self.postMessage({ type: 'log', msg: `[worker] inited with ${satRecords.length}` }); } catch { }
        self.postMessage({ type: 'inited', count: satRecords.length });
    }

    function handleTick(timeMs) {
        const date = new Date(timeMs);
        const n = satRecords.length;
        const positions = new Float32Array(n * 3);
        const posECEF = new Float32Array(n * 3);
        const velECEF = new Float32Array(n * 3);
        const gmst = satellite.gstime(date);
        const OMEGA_EARTH = 7.2921150e-5; // rad/s
        for (let i = 0; i < n; i++) {
            const rec = satRecords[i];
            let lonlatm = [NaN, NaN, NaN];
            try {
                const pv = satellite.propagate(
                    rec.satrec,
                    date.getUTCFullYear(),
                    date.getUTCMonth() + 1,
                    date.getUTCDate(),
                    date.getUTCHours(),
                    date.getUTCMinutes(),
                    date.getUTCSeconds()
                );
                if (pv && pv.position) {
                    const p = toLonLatHeight(pv.position, date);
                    if (p) lonlatm = p;
                    // ECI -> ECEF position
                    try {
                        const ecefPosKm = satellite.eciToEcf(pv.position, gmst);
                        // Convert to meters
                        const x = ecefPosKm.x * 1000, y = ecefPosKm.y * 1000, z = ecefPosKm.z * 1000;
                        // Velocity in ECEF: R*(v_eci - omega x r_eci)
                        if (pv.velocity) {
                            const vxEci = pv.velocity.x * 1000; // m/s
                            const vyEci = pv.velocity.y * 1000;
                            const vzEci = pv.velocity.z * 1000;
                            // omega x r_eci (omega along +Z)
                            const oxr_x = -OMEGA_EARTH * (pv.position.y * 1000);
                            const oxr_y = OMEGA_EARTH * (pv.position.x * 1000);
                            const oxr_z = 0;
                            const vRelEci_x = vxEci - oxr_x;
                            const vRelEci_y = vyEci - oxr_y;
                            const vRelEci_z = vzEci - oxr_z;
                            // Rotate velocity by gmst as well
                            const cosT = Math.cos(gmst), sinT = Math.sin(gmst);
                            const vx = cosT * vRelEci_x + sinT * vRelEci_y;
                            const vy = -sinT * vRelEci_x + cosT * vRelEci_y;
                            const vz = vRelEci_z;
                            const j3 = i * 3;
                            posECEF[j3] = x; posECEF[j3 + 1] = y; posECEF[j3 + 2] = z;
                            velECEF[j3] = vx; velECEF[j3 + 1] = vy; velECEF[j3 + 2] = vz;
                        } else {
                            const j3 = i * 3;
                            posECEF[j3] = x; posECEF[j3 + 1] = y; posECEF[j3 + 2] = z;
                            velECEF[j3] = 0; velECEF[j3 + 1] = 0; velECEF[j3 + 2] = 0;
                        }
                    } catch (e) { /* ignore ECEF fail */ }
                }
            } catch (e) { }
            const j = i * 3;
            positions[j] = lonlatm[0];
            positions[j + 1] = lonlatm[1];
            positions[j + 2] = lonlatm[2];
        }
        // Fallback lon/lat/h for non-instanced path
        try {
            self.postMessage({ type: 'positions', time: timeMs, positions }, [positions.buffer]);
            if (DEBUG) try { self.postMessage({ type: 'log', msg: `[worker] positions sent n=${n}` }); } catch { }
        } catch (e) { }
        // New PV message for instanced interpolation
        try {
            self.postMessage({ type: 'pv', epochMs: timeMs, pos: posECEF, vel: velECEF }, [posECEF.buffer, velECEF.buffer]);
            if (DEBUG) try { self.postMessage({ type: 'log', msg: `[worker] pv sent n=${n}` }); } catch { }
        } catch (e) { }
    }

    function handleTrack(satId) {
        const rec = satRecords.find((s) => s.id === satId);
        if (!rec) { self.postMessage({ type: 'track', id: satId, positions: null }); return; }

        // Single-orbit path with constant Earth orientation (GMST0)
        try {
            const start = new Date();
            const gmst0 = satellite.gstime(start);
            const meanMotionRadPerMin = rec.satrec.no; // radians/minute
            if (!meanMotionRadPerMin || !isFinite(meanMotionRadPerMin)) { self.postMessage({ type: 'track', id: satId, positions: null }); return; }
            const periodMin = (2 * Math.PI) / meanMotionRadPerMin; // minutes
            const SAMPLES = 512;
            const positions = new Float32Array(SAMPLES * 3);
            let k = 0;
            for (let i = 0; i < SAMPLES; i++) {
                const dtMs = (i * periodMin * 60 * 1000) / SAMPLES;
                const t = new Date(start.getTime() + dtMs);
                let out = [NaN, NaN, NaN];
                try {
                    const pv = satellite.propagate(
                        rec.satrec,
                        t.getUTCFullYear(),
                        t.getUTCMonth() + 1,
                        t.getUTCDate(),
                        t.getUTCHours(),
                        t.getUTCMinutes(),
                        t.getUTCSeconds()
                    );
                    if (pv && pv.position) {
                        const gd = satellite.eciToGeodetic(pv.position, gmst0);
                        if (gd && isFinite(gd.longitude) && isFinite(gd.latitude) && isFinite(gd.height)) {
                            // Normalize longitude to [-PI, PI], convert to degrees/meters
                            let lon = gd.longitude;
                            while (lon < -Math.PI) lon += 2 * Math.PI;
                            while (lon > Math.PI) lon -= 2 * Math.PI;
                            const lat = gd.latitude;
                            const h = gd.height;
                            const rad2deg = 180 / Math.PI;
                            out = [lon * rad2deg, lat * rad2deg, h * 1000];
                        }
                    }
                } catch (e) { /* keep NaN */ }
                positions[k++] = out[0];
                positions[k++] = out[1];
                positions[k++] = out[2];
            }
            self.postMessage({ type: 'track', id: satId, positions }, [positions.buffer]);
        } catch (e) {
            self.postMessage({ type: 'track', id: satId, positions: null });
        }
    }

    self.onmessage = function (ev) {
        const data = ev.data || {};
        if (data.type === 'init') handleInit(data.payload || []);
        else if (data.type === 'tick') handleTick(data.time || Date.now());
        else if (data.type === 'track') handleTrack(data.id);
    };
})();

