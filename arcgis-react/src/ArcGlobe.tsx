import React, { useEffect, useRef } from 'react';

declare global {
    interface Window {
        require: any;
        ArcgisUI?: any;
        ArcgisDataLoader?: any;
        satellite: any;
    }
}

export const ArcGlobe: React.FC = () => {
    const divRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        let view: any;
        let worker: Worker | null = null;
        let satelliteLayer: any;
        let debrisLayer: any;
        let tracksLayer: any;
        const graphics: any[] = [];
        const useInstanced = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('instanced') === '1';
        let instancedApi: any = null;

        // If instanced flag is on, load glue scripts early
        if (useInstanced) {
            const s1 = document.createElement('script'); s1.src = '/arcgis/instanced/renderer.js'; s1.async = true; document.head.appendChild(s1);
            const s2 = document.createElement('script'); s2.src = '/arcgis/instanced/customLayer.js'; s2.async = true; document.head.appendChild(s2);
        }

        function getSatPointFromTle(date: Date, tle1: string, tle2: string) {
            try {
                const satrec = window.satellite.twoline2satrec(tle1, tle2);
                const pv = window.satellite.propagate(
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
                const gmst = window.satellite.gstime(date);
                const gd = window.satellite.eciToGeodetic(positionEci, gmst);
                if (!gd) return null;
                let lon = gd.longitude;
                const lat = gd.latitude;
                const hKm = gd.height;
                if ([lon, lat, hKm].some((v) => Number.isNaN(v))) return null;
                const rad2deg = 180 / Math.PI;
                while (lon < -Math.PI) lon += 2 * Math.PI;
                while (lon > Math.PI) lon -= 2 * Math.PI;
                return {
                    type: 'point',
                    x: lon * rad2deg,
                    y: lat * rad2deg,
                    z: hKm * 1000,
                    spatialReference: { wkid: 4326 },
                } as const;
            } catch {
                return null;
            }
        }

        function createTrackPolyline(pointsLngLatZ: number[][]) {
            return { type: 'polyline', paths: [pointsLngLatZ], spatialReference: { wkid: 4326 } } as const;
        }

        function start(Map: any, SceneView: any, GraphicsLayer: any, Graphic: any) {
            const map = new Map({ basemap: 'satellite', ground: 'world-elevation' });

            view = new SceneView({
                container: divRef.current!,
                map,
                qualityProfile: 'high',
                constraints: { altitude: { max: 12000000000 } },
                environment: {
                    lighting: { date: new Date(), directShadowsEnabled: false },
                    atmosphereEnabled: true,
                    starsEnabled: true,
                },
                popup: { dockEnabled: true, dockOptions: { breakpoint: false } },
            });

            satelliteLayer = new GraphicsLayer();
            debrisLayer = new GraphicsLayer();
            tracksLayer = new GraphicsLayer();
            map.addMany([satelliteLayer, debrisLayer, tracksLayer]);

            // If instanced, attach external renderer
            if (useInstanced) {
                const id = setInterval(() => {
                    if ((window as any).ArcgisInstanced && view) {
                        clearInterval(id);
                        try { instancedApi = (window as any).ArcgisInstanced.create(view, {}); } catch { }
                    }
                }, 50);
            }

            function addSatGraphic(sat: any) {
                const now = new Date();
                const pt = getSatPointFromTle(now, sat.tle1, sat.tle2);
                if (!pt) return;
                const g = new Graphic({
                    geometry: pt,
                    symbol: { type: 'picture-marker', url: 'https://i.ibb.co/0y1d3Zk/Sat-PNG.png', width: 8, height: 8 },
                    attributes: {
                        name: sat.name || 'SAT',
                        id: graphics.length,
                        tle1: sat.tle1,
                        tle2: sat.tle2,
                        t0: Date.now(),
                        norad: sat.norad || null,
                        launchDate: sat.launchDate || null,
                        country: sat.country || null,
                    },
                    popupEnabled: false,
                });
                satelliteLayer.add(g);
                graphics.push(g);
            }

            function addDebrisGraphic(sat: any) {
                const now = new Date();
                const pt = getSatPointFromTle(now, sat.tle1, sat.tle2);
                if (!pt) return;
                const g = new Graphic({
                    geometry: pt,
                    symbol: { type: 'simple-marker', style: 'circle', color: [200, 200, 200, 0.7], size: 2 },
                    attributes: { name: sat.name || 'DEBRIS', tle1: sat.tle1, tle2: sat.tle2 },
                });
                debrisLayer.add(g);
            }

            function drawTrackForGraphic(graphic: any) {
                tracksLayer.removeAll();
                if (!worker) {
                    const positions: number[][] = [];
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
                            symbol: { type: 'line-3d', symbolLayers: [{ type: 'line', size: 2, material: { color: [192, 192, 192, 0.6] } }] },
                        });
                        tracksLayer.add(line);
                    }
                    return;
                }
                worker.postMessage({ type: 'track', id: graphic.attributes.id });
            }

            view.when(() => {
                view.popup.autoOpenEnabled = false;

                view.on('immediate-click', (evt: any) => {
                    view.hitTest(evt).then((res: any) => {
                        const feat = res.results && res.results.find((r: any) => r.layer === satelliteLayer)?.graphic;
                        tracksLayer.removeAll();
                        if (feat) drawTrackForGraphic(feat);
                    });
                });

                if (useInstanced) {
                    // In instanced mode, refresh lighting continuously to avoid visible lag
                    try {
                        view.on('frame-update', () => { view.environment.lighting.date = new Date(); });
                    } catch {
                        // Fallback: frequent timer
                        const lid = setInterval(() => { try { view.environment.lighting.date = new Date(); } catch { } }, 33);
                        // best effort cleanup on destroy handled below
                    }
                } else {
                    setInterval(() => { view.environment.lighting.date = new Date(); }, 1000);
                }

                let uiRef: any = null;
                if (window.ArcgisUI?.createUI) {
                    uiRef = window.ArcgisUI.createUI({
                        root: document.body,
                        sets: ['Satellites', 'Debris'],
                        selected: ['Satellites', 'Debris'],
                        onChange: (sel: string[]) => {
                            satelliteLayer.visible = sel.includes('Satellites');
                            debrisLayer.visible = sel.includes('Debris');
                        },
                    });
                }

                view.on('pointer-move', (evt: any) => {
                    if (!uiRef) return;
                    view.hitTest(evt).then((res: any) => {
                        const hit = res.results && res.results.find((r: any) => r.layer === satelliteLayer)?.graphic;
                        if (!hit) { uiRef.hideHover(); return; }
                        const attr = hit.attributes || {};
                        const name = attr.name || 'SAT';
                        const norad = attr.norad ? String(attr.norad) : '—';
                        const launch = attr.launchDate || '—';
                        const country = (attr.country || '').toString().toUpperCase();
                        const flagUrl = country && country.length <= 3 ? `/flags/${country.toLowerCase()}.png` : '';
                        const img = flagUrl ? `<img src="${flagUrl}" alt="${country}" style="height:12px;vertical-align:middle;margin-right:6px"/>` : '';
                        const html = `${img}<b>${name}</b><br/>NORAD: ${norad}<br/>Launched: ${launch}`;
                        uiRef.showHover(html, evt.x, evt.y);
                    });
                });
            });

            (async function loadData() {
                try {
                    const MAX_SATS = 1000;
                    const datasets = (window.ArcgisDataLoader?.loadAllSources)
                        ? await window.ArcgisDataLoader.loadAllSources({
                            apiUrl: '/api-keeptrack/v3/sats',
                            asciiUrl: '/tle/TLE.txt',
                            debrisUrl: 'https://app.keeptrack.space/tle/TLEdebris.json',
                            vimpelUrl: '/api-keeptrack/v3/r2/vimpel.json',
                            extraUrl: '/tle/extra.json',
                            celestrakGroups: ['starlink'],
                        })
                        : { main: [], debris: [], vimpel: [], extra: [], celestrak: {} };

                    (datasets.main || []).slice(0, MAX_SATS).forEach(addSatGraphic);
                    (datasets.debris || []).slice(0, 5000).forEach(addDebrisGraphic);

                    try {
                        // Use classic worker served from public to avoid bundler issues
                        worker = new Worker('/arcgis/worker.js');
                        const payload = (datasets.main || []).slice(0, MAX_SATS).map((s: any, idx: number) => ({ id: idx, name: s.name || 'SAT', tle1: s.tle1, tle2: s.tle2 }));
                        worker.postMessage({ type: 'init', payload });

                        worker.onmessage = (ev: MessageEvent) => {
                            const data: any = ev.data || {};
                            if (data.type === 'positions' && data.positions && (data.positions as ArrayBuffer)) {
                                const arr = new Float32Array(data.positions);
                                if (useInstanced && instancedApi) {
                                    instancedApi.updatePositions((data.positions as ArrayBuffer), Math.floor(arr.length / 3));
                                } else {
                                    for (let i = 0; i < graphics.length; i++) {
                                        const j = i * 3;
                                        const x = arr[j], y = arr[j + 1], z = arr[j + 2];
                                        if (!Number.isNaN(x) && !Number.isNaN(y) && !Number.isNaN(z)) {
                                            graphics[i].geometry = { type: 'point', x, y, z, spatialReference: { wkid: 4326 } };
                                        }
                                    }
                                }
                            } else if (data.type === 'track' && data.positions) {
                                const arr = new Float32Array(data.positions);
                                const path: number[][] = [];
                                for (let k = 0; k < arr.length; k += 3) {
                                    const x = arr[k], y = arr[k + 1], z = arr[k + 2];
                                    if (!Number.isNaN(x) && !Number.isNaN(y) && !Number.isNaN(z)) path.push([x, y, z]);
                                }
                                if (path.length > 1) {
                                    const line = new Graphic({
                                        geometry: createTrackPolyline(path),
                                        symbol: { type: 'line-3d', symbolLayers: [{ type: 'line', size: 2, material: { color: [192, 192, 192, 0.6] } }] },
                                    });
                                    tracksLayer.add(line);
                                }
                            }
                        };

                        setInterval(() => {
                            if (worker) worker.postMessage({ type: 'tick', time: Date.now() });
                        }, 1000);
                    } catch {
                        setInterval(() => {
                            const now = new Date();
                            for (let i = 0; i < graphics.length; i++) {
                                const g = graphics[i];
                                const pt = getSatPointFromTle(now, g.attributes.tle1, g.attributes.tle2);
                                if (pt) g.geometry = pt;
                            }
                        }, 1000);
                    }
                } catch (e) {
                    console.error(e);
                }
            })();
        }

        function boot() {
            if (window.require && divRef.current) {
                window.require(
                    ['esri/Map', 'esri/views/SceneView', 'esri/layers/GraphicsLayer', 'esri/Graphic'],
                    (Map: any, SceneView: any, GraphicsLayer: any, Graphic: any) => start(Map, SceneView, GraphicsLayer, Graphic)
                );
            } else {
                const id = setInterval(() => {
                    if (window.require && divRef.current) {
                        clearInterval(id);
                        boot();
                    }
                }, 50);
            }
        }

        boot();

        return () => {
            try { (view as any)?.destroy?.(); } catch { }
            try { worker?.terminate?.(); } catch { }
        };
    }, []);

    return <div id="viewDiv" ref={divRef} style={{ position: 'absolute', inset: 0 }} />;
};


