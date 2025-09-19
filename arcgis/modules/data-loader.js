(function () {
    function withTimeout(promise, ms) {
        return new Promise((resolve, reject) => {
            const t = setTimeout(() => reject(new Error('timeout')), ms);
            promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
        });
    }

    function parseAsciiTle(text) {
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
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

    function normalizeApiItems(json) {
        if (!json) return [];
        const arr = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
        const out = [];
        for (let i = 0; i < arr.length; i++) {
            const it = arr[i] || {};
            const tle1 = it.tle1 || it.line1 || it.TLE_LINE1 || it.tle_line1 || it.TLE1;
            const tle2 = it.tle2 || it.line2 || it.TLE_LINE2 || it.tle_line2 || it.TLE2;
            if (typeof tle1 === 'string' && typeof tle2 === 'string' && tle1.startsWith('1 ') && tle2.startsWith('2 ')) {
                const name = it.name || it.OBJECT_NAME || it.objectName || it.title || 'SAT';
                const norad = it.norad || it.noradId || it.norad_id || it.NORAD_CAT_ID || it.SATCAT || it.scc || it.sccNum || it.CATALOG_NUMBER;
                const launchDate = it.launchDate || it.LAUNCH_DATE || it.launch || it.dateLaunched || it.LAUNCH;
                const country = it.country || it.owner || it.OWNER || it.COUNTRY || it.Nation || it.COUNTRY_CODE || it.owners || it.OWNER_CODE;
                out.push({ name, tle1, tle2, norad, launchDate, country });
            }
        }
        return out;
    }

    async function fetchApiTles(apiUrl) {
        const res = await withTimeout(fetch(apiUrl, { cache: 'no-cache' }), 10000);
        if (!res.ok) throw new Error('api fetch failed');
        const json = await res.json();
        const sats = normalizeApiItems(json);
        if (!sats.length) throw new Error('no tle in api');
        return sats;
    }

    async function fetchAsciiTles(asciiUrl) {
        const res = await withTimeout(fetch(asciiUrl, { cache: 'no-cache' }), 10000);
        if (!res.ok) throw new Error('ascii fetch failed');
        const txt = await res.text();
        const sats = parseAsciiTle(txt);
        if (!sats.length) throw new Error('no tle in ascii');
        return sats;
    }

    async function loadSatTLEs(opts) {
        const apiUrl = opts?.apiUrl || 'https://api.keeptrack.space/v3/sats';
        const asciiUrl = opts?.asciiUrl || '../tle/TLE.txt';
        try {
            return await fetchApiTles(apiUrl);
        } catch (e) {
            try { return await fetchAsciiTles(asciiUrl); }
            catch (e2) { return []; }
        }
    }

    async function fetchJsonArray(url) {
        const res = await withTimeout(fetch(url, { cache: 'no-cache' }), 12000);
        if (!res.ok) throw new Error('json fetch failed');
        return await res.json();
    }

    async function fetchDebris(url) {
        const json = await fetchJsonArray(url);
        return normalizeApiItems(json);
    }

    async function fetchVimpel(url) {
        const json = await fetchJsonArray(url);
        return normalizeApiItems(json);
    }

    async function fetchExtra(extraUrl) {
        try {
            const json = await fetchJsonArray(extraUrl);
            const n = normalizeApiItems(json);
            return n;
        } catch (e) {
            return [];
        }
    }

    async function fetchCelestrakGroup(group) {
        const url = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${encodeURIComponent(group)}&FORMAT=3LE`;
        const res = await withTimeout(fetch(url, { cache: 'no-cache' }), 12000);
        if (!res.ok) throw new Error('celestrak fetch failed');
        const txt = await res.text();
        return parseAsciiTle(txt);
    }

    async function loadAllSources(options) {
        const apiUrl = options?.apiUrl || 'https://api.keeptrack.space/v3/sats';
        const asciiUrl = options?.asciiUrl || '../tle/TLE.txt';
        const debrisUrl = options?.debrisUrl || 'https://app.keeptrack.space/tle/TLEdebris.json';
        const vimpelUrl = options?.vimpelUrl || 'https://api.keeptrack.space/v3/r2/vimpel.json';
        const extraUrl = options?.extraUrl || '../tle/extra.json';
        const groups = options?.celestrakGroups || [];

        const results = { main: [], debris: [], vimpel: [], extra: [], celestrak: {} };

        try { results.main = await fetchApiTles(apiUrl); }
        catch (e) { try { results.main = await fetchAsciiTles(asciiUrl); } catch (e2) { results.main = []; } }

        await Promise.all([
            (async () => { try { results.debris = await fetchDebris(debrisUrl); } catch (e) { } })(),
            (async () => { try { results.vimpel = await fetchVimpel(vimpelUrl); } catch (e) { } })(),
            (async () => { try { results.extra = await fetchExtra(extraUrl); } catch (e) { } })(),
            (async () => {
                for (const g of groups) {
                    try { results.celestrak[g] = await fetchCelestrakGroup(g); } catch (e) { results.celestrak[g] = []; }
                }
            })(),
        ]);

        return results;
    }

    window.ArcgisDataLoader = {
        loadSatTLEs,
        loadAllSources,
    };
})();


