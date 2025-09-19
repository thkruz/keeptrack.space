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
        const useInstanced = true;
        const DEBUG = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';
        let instancedApi: any = null;
        let selectedId: number | null = null;
        let metaRef: any[] = [];
        let hoverTimeout: number | null = null;
        let tooltip: HTMLElement | null = null;

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

        function createTooltip() {
            if (tooltip) return tooltip;

            tooltip = document.createElement('div');
            tooltip.style.cssText = `
                position: absolute;
                background: rgba(15, 15, 15, 0.95);
                color: white;
                padding: 12px 16px;
                border-radius: 8px;
                font-family: 'Segoe UI', Arial, sans-serif;
                font-size: 12px;
                pointer-events: none;
                z-index: 1000;
                max-width: 250px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                border: 1px solid rgba(255, 255, 255, 0.15);
                backdrop-filter: blur(10px);
                transition: opacity 0.2s ease-in-out;
            `;
            document.body.appendChild(tooltip);
            return tooltip;
        }

        function showTooltip(x: number, y: number, content: string) {
            const tooltipEl = createTooltip();
            tooltipEl.innerHTML = content;
            tooltipEl.style.left = `${x + 10}px`;
            tooltipEl.style.top = `${y - 10}px`;
            tooltipEl.style.display = 'block';
        }

        function hideTooltip() {
            if (tooltip) {
                tooltip.style.display = 'none';
            }
        }

        function start(Map: any, SceneView: any, GraphicsLayer: any, Graphic: any) {
            const map = new Map({ basemap: 'satellite', ground: 'world-elevation' });

            view = new SceneView({
                container: divRef.current!,
                map,
                qualityProfile: 'high',
                constraints: { altitude: { max: 12000000000 } },
                environment: {
                    lighting: { date: new Date(), directShadowsEnabled: true },
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
                        try {
                            instancedApi = (window as any).ArcgisInstanced.create(view, {});

                            // Add event handlers after API is ready
                            view.on('click', (evt: any) => {
                                evt.stopPropagation();
                                if (!instancedApi) {
                                    return;
                                }

                                // Add small delay to ensure picking is stable
                                setTimeout(() => {
                                    const id = instancedApi.pick(evt.x, evt.y);
                                    if (id < 0) {
                                        // Clicked on empty space - clear selection
                                        if (selectedId !== null) {
                                            tracksLayer.removeAll();
                                            selectedId = null;
                                            hideTooltip();
                                            // Clear selection in renderer
                                            instancedApi.setSelectedId(-1);
                                        }
                                        return;
                                    }

                                    if (id === selectedId) {
                                        // Clicked on same satellite - toggle off
                                        tracksLayer.removeAll();
                                        selectedId = null;
                                        hideTooltip();
                                        // Clear selection in renderer
                                        instancedApi.setSelectedId(-1);
                                    } else {
                                        // Clicked on different satellite - show orbit and info
                                        selectedId = id;
                                        // Highlight selected satellite in renderer
                                        instancedApi.setSelectedId(id);

                                        // Show satellite info tooltip
                                        if (metaRef[id]) {
                                            const sat = metaRef[id];
                                            const name = sat.name || 'Unknown Satellite';
                                            const norad = sat.norad ? String(sat.norad) : 'N/A';
                                            const launch = sat.launchDate ? new Date(sat.launchDate).toLocaleDateString() : 'Unknown';
                                            const country = (sat.country || '').toString().toUpperCase();
                                            const flagUrl = country && country.length <= 3 ? `/flags/${country.toLowerCase()}.png` : '';
                                            const img = flagUrl ? `<img src="${flagUrl}" alt="${country}" style="height:16px;vertical-align:middle;margin-right:8px;border-radius:2px"/>` : '';

                                            // Better formatted HTML for click tooltip
                                            const html = `
                                            <div style="line-height: 1.5; min-width: 200px;">
                                                <div style="border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 6px; margin-bottom: 6px;">
                                                    ${img}<strong style="color: #4CAF50; font-size: 14px;">${name}</strong>
                                                </div>
                                                <div style="color: #B0BEC5; font-size: 12px;">
                                                    <div style="margin-bottom: 4px;">
                                                        <span style="color: #B0BEC5;">NORAD ID:</span> 
                                                        <span style="color: #FFC107; font-weight: bold;">${norad}</span>
                                                    </div>
                                                    <div style="margin-bottom: 4px;">
                                                        <span style="color: #B0BEC5;">Launch Date:</span> 
                                                        <span style="color: #E1F5FE;">${launch}</span>
                                                    </div>
                                                    ${country ? `
                                                        <div style="margin-bottom: 4px;">
                                                            <span style="color: #B0BEC5;">Country:</span> 
                                                            <span style="color: #F3E5F5;">${country}</span>
                                                        </div>
                                                    ` : ''}
                                                    <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1); color: #81C784; font-size: 11px;">
                                                        Click again to hide orbit
                                                    </div>
                                                </div>
                                            </div>
                                        `;

                                            showTooltip(evt.x, evt.y, html);
                                        }

                                        if (worker) {
                                            worker.postMessage({ type: 'track', id: id });
                                        }
                                    }
                                }, 50); // Small delay for stable picking
                            });

                            // Hover handler for satellite info
                            view.on('pointer-move', (evt: any) => {
                                if (!instancedApi) {
                                    return;
                                }

                                // Debounce hover picking with longer delay to reduce jitter
                                if (hoverTimeout) {
                                    clearTimeout(hoverTimeout);
                                }

                                hoverTimeout = setTimeout(() => {
                                    const id = instancedApi.pick(evt.x, evt.y);
                                    if (id >= 0 && metaRef[id] && id !== selectedId) {
                                        const sat = metaRef[id];
                                        const name = sat.name || 'Unknown Satellite';
                                        const norad = sat.norad ? String(sat.norad) : 'N/A';
                                        const launch = sat.launchDate ? new Date(sat.launchDate).toLocaleDateString() : 'Unknown';
                                        const country = (sat.country || '').toString().toUpperCase();
                                        const flagUrl = country && country.length <= 3 ? `/flags/${country.toLowerCase()}.png` : '';
                                        const img = flagUrl ? `<img src="${flagUrl}" alt="${country}" style="height:14px;vertical-align:middle;margin-right:8px;border-radius:2px"/>` : '';

                                        // Better formatted HTML with improved styling
                                        const html = `
                                            <div style="line-height: 1.4;">
                                                ${img}<strong style="color: #4CAF50;">${name}</strong>
                                                <br/>
                                                <span style="color: #B0BEC5;">NORAD ID:</span> <span style="color: #FFC107;">${norad}</span>
                                                <br/>
                                                <span style="color: #B0BEC5;">Launch Date:</span> <span style="color: #E1F5FE;">${launch}</span>
                                                ${country ? `<br/><span style="color: #B0BEC5;">Country:</span> <span style="color: #F3E5F5;">${country}</span>` : ''}
                                            </div>
                                        `;

                                        // Show hover tooltip (only if not already selected)
                                        showTooltip(evt.x, evt.y, html);
                                    } else if (id < 0) {
                                        // Hide tooltip when not hovering over satellite
                                        hideTooltip();
                                    }
                                }, 150); // Increased debounce time from 100ms to 150ms
                            });

                        } catch (e) { if (DEBUG) console.error('[ArcGlobe] instanced create failed', e); }
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

                if (!useInstanced) {
                    view.on('immediate-click', (evt: any) => {
                        view.hitTest(evt).then((res: any) => {
                            const feat = res.results && res.results.find((r: any) => r.layer === satelliteLayer)?.graphic;
                            tracksLayer.removeAll();
                            if (feat) drawTrackForGraphic(feat);
                        });
                    });
                }

                // Set lighting date once for dynamic lighting
                view.environment.lighting.date = new Date();

                // Update lighting less frequently to reduce fidgeting
                setInterval(() => {
                    try {
                        view.environment.lighting.date = new Date();
                    } catch (e) { }
                }, 5000); // Reduced from 1000ms to 5000ms (5 seconds)

                // Watch camera changes to trigger re-renders
                view.watch('camera', () => {
                    try {
                        // @ts-ignore - ArcGIS module loading
                        require(['esri/views/3d/externalRenderers'], function (externalRenderers: any) {
                            externalRenderers.requestRender(view);
                        });
                    } catch (e) { }
                });


                if (!useInstanced) {
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
                }
            });

            (async function loadData() {
                try {
                    const MAX_SATS = 30000;
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

                    if (!useInstanced) {
                        (datasets.main || []).slice(0, MAX_SATS).forEach(addSatGraphic);
                        (datasets.debris || []).slice(0, 5000).forEach(addDebrisGraphic);
                    }

                    try {
                        // Store metadata reference for picking
                        metaRef = (datasets.main || []).slice(0, MAX_SATS);

                        // Use classic worker served from public to avoid bundler issues
                        worker = new Worker('/arcgis/worker.js');
                        const payload = metaRef.map((s: any, idx: number) => ({ id: idx, name: s.name || 'SAT', tle1: s.tle1, tle2: s.tle2 }));
                        worker.postMessage({ type: 'init', payload });

                        worker.onmessage = (ev: MessageEvent) => {
                            const data: any = ev.data || {};
                            if (data.type === 'log' && DEBUG) { console.log('[worker]', data.msg); return; }
                            // Ignore PV for now; renderer expects lon/lat/h. Use 'positions' path below.
                            if (data.type === 'positions' && data.positions) {
                                const arr = data.positions instanceof Float32Array ? data.positions : new Float32Array(data.positions as ArrayBuffer);
                                if (useInstanced && instancedApi) {
                                    instancedApi.updatePositions(arr.buffer, Math.floor(arr.length / 3));
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
            try { if (hoverTimeout) clearTimeout(hoverTimeout); } catch { }
            try { if (tooltip) tooltip.remove(); } catch { }
        };
    }, []);

    return <div id="viewDiv" ref={divRef} style={{ position: 'absolute', inset: 0 }} />;
};


