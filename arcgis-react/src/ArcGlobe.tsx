import React, { useEffect, useRef, useState } from 'react';
import '~/styles/ArcGlobe.css';
import { FeatureHost, type ActiveFeature } from './components/features';
import { type CollisionEvent } from './components/features/CollisionAnalysis';
import { type Constellation } from './components/features/ConstellationAnalysis';
import { type SatelliteFormData } from './components/features/CreateSatellite';
import { Footer } from './components/footer';
import { Header } from './components/header';
import { SatelliteService, type SatelliteData } from './services/satelliteService';
import { TooltipService } from './services/tooltipService';

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
    const instancedApiRef = useRef<any>(null);
    const isLoadingRef = useRef(true);
    const [isLoading, setIsLoading] = useState(true);
    const satelliteService = SatelliteService.getInstance();
    const tooltipService = TooltipService.getInstance();

    // Menu state
    const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
    const [showCollisionAnalysis, setShowCollisionAnalysis] = useState(false);
    const [showCreateSatellite, setShowCreateSatellite] = useState(false);
    const [showConstellationAnalysis, setShowConstellationAnalysis] = useState(false);
    const [showDebrisScanner, setShowDebrisScanner] = useState(false);

    const handleConstellationSelect = (constellation: Constellation) => {
        console.log('Constellation selected:', constellation);
    };

    const handleCollisionSelect = (collision: CollisionEvent) => {
        console.log('Collision selected:', collision);
        if (instancedApiRef.current) {
            const ids: number[] = [];
            const sat1Id = resolveSatelliteId(collision.SAT1, collision.SAT1_NAME || '');
            const sat2Id = resolveSatelliteId(collision.SAT2, collision.SAT2_NAME || '');

            if (typeof sat1Id !== 'number') {
                console.warn('[Collision] SAT1 unresolved', {
                    ID: collision.SAT1,
                    name: collision.SAT1_NAME
                });
            }

            if (typeof sat2Id !== 'number') {
                console.warn('[Collision] SAT2 unresolved', {
                    ID: collision.SAT2,
                    name: collision.SAT2_NAME
                });
            }

            if (typeof sat1Id === 'number') {
                ids.push(sat1Id);
            }
            if (typeof sat2Id === 'number') {
                ids.push(sat2Id);
            }

            if (ids.length > 0) {
                instancedApiRef.current.resetVisibility();
                instancedApiRef.current.setVisibleSatellites(ids, [1.0, 0.5, 0.0]);
                instancedApiRef.current.setHighlightedSatellite(null);
                console.log(`Highlighting collision satellites: ${collision.SAT1_NAME}${typeof sat2Id === 'number' ? ` and ${collision.SAT2_NAME}` : ''}`);
            } else {
                console.warn('No matching satellites found for collision pair', collision.SAT1, collision.SAT2);
                instancedApiRef.current.resetVisibility();
            }
        }
    };

    const handleSatelliteCreated = (satelliteData: SatelliteFormData) => {
        console.log('Creating satellite:', satelliteData);
        try {
            const newSatellite = satelliteService.createSatellite(satelliteData);
            console.log('Satellite created successfully:', newSatellite);
        } catch (error) {
            console.error('Error creating satellite:', error);
        }
    };

    const handleConstellationHighlight = (constellation: Constellation | null, interaction: 'hover' | 'select' | 'clear' = 'hover') => {
        if (!instancedApiRef.current) {
            return;
        }

        if (interaction === 'hover') {
            // Do not change visibility on hover to avoid disruptive flicker
            return;
        }

        if (interaction === 'select' && constellation) {
            const ids = constellation.satellites.map(s => s.id).filter(id => typeof id === 'number');
            if (ids.length > 0) {
                instancedApiRef.current.resetVisibility();
                instancedApiRef.current.setVisibleSatellites(ids, [1.0, 0.5, 0.0]);
                instancedApiRef.current.setHighlightedSatellite(null);
                console.log(`Highlighting ${ids.length} satellites of constellation ${constellation.name}`);
            }
            return;
        }

        // Handle clearing (either explicit clear or a deselection)
        instancedApiRef.current.resetVisibility();
        instancedApiRef.current.setHighlightedSatellite(null);
        console.log('Clearing constellation highlight');
    };

    const activeFeature: ActiveFeature | null = showCollisionAnalysis
        ? { name: 'collision', props: { onClose: () => handleCloseCollisionAnalysis(), onCollisionSelect: handleCollisionSelect } }
        : showCreateSatellite
            ? { name: 'create-satellite', props: { onClose: () => handleCloseCreateSatellite(), onSatelliteCreated: handleSatelliteCreated } }
            : showConstellationAnalysis
                ? { name: 'constellation', props: { onClose: () => handleCloseConstellationAnalysis(), onConstellationSelect: handleConstellationSelect, onConstellationHighlight: handleConstellationHighlight } }
                : showDebrisScanner
                    ? { name: 'debris-scanner', props: { onClose: () => handleCloseDebrisScanner(), getInstancedApi: () => instancedApiRef.current, satelliteService } }
                    : null;

    const activeFeatureTitle = activeFeature ? (
        activeFeature.name === 'collision' ? 'Collision Analysis' :
            activeFeature.name === 'create-satellite' ? 'Create Satellite' :
                activeFeature.name === 'constellation' ? 'Constellation Analysis' :
                    activeFeature.name === 'debris-scanner' ? 'Debris Scanner' : null
    ) : null;

    // Feature handlers
    const handleFeatureSelect = (feature: string) => {
        setSelectedFeature(feature);

        switch (feature) {
            case 'collision':
                setShowCollisionAnalysis(true);
                break;
            case 'constellation':
                setShowConstellationAnalysis(true);
                break;
            case 'create-satellite':
                setShowCreateSatellite(true);
                break;
            case 'new-launch':
                // TODO: Implement new launch
                console.log('New Launch feature selected');
                break;
            case 'create-breakup':
                // TODO: Implement create breakup
                console.log('Create Breakup feature selected');
                break;
            case 'debris-scanner':
                setShowDebrisScanner(true);
                break;
            default:
                break;
        }
    };

    const resolveSatelliteId = (noradValue: string | number, name: string): number | undefined => {
        const sat = satelliteService.resolveSatellite(noradValue?.toString(), name);
        return sat?.id;
    };

    const handleCloseCollisionAnalysis = () => {
        setShowCollisionAnalysis(false);
        setSelectedFeature(null);
        if (instancedApiRef.current) {
            instancedApiRef.current.resetVisibility();
            instancedApiRef.current.setHighlightedSatellite(null);
        }
    };

    const handleCloseCreateSatellite = () => {
        setShowCreateSatellite(false);
        setSelectedFeature(null);
    };

    const handleTestConstellations = () => {
        setShowConstellationAnalysis(true);
    };

    const handleCloseConstellationAnalysis = () => {
        setShowConstellationAnalysis(false);
        if (instancedApiRef.current) {
            instancedApiRef.current.resetVisibility();
            instancedApiRef.current.setHighlightedSatellite(null);
        }
    };

    const handleCloseDebrisScanner = () => {
        setShowDebrisScanner(false);
        setSelectedFeature(null);
    };

    const handleSearchSatellites = (query: string) => {
        console.log('Searching for satellites:', query);
        const results = satelliteService.searchSatellites(query);
        console.log('Search results:', results);
        // TODO: Implement visual filtering on the globe
    };

    const handleShowUserCreated = () => {
        console.log('Showing user-created satellites');
        const userCreated = satelliteService.getUserCreatedSatellites();
        console.log('User-created satellites:', userCreated);
        // TODO: Implement visual highlighting on the globe
    };

    useEffect(() => {
        let view: any;
        let worker: Worker | null = null;
        let tracksLayer: any;
        const useInstanced = true;
        const DEBUG = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';
        let instancedApi: any = null;
        let selectedId: number | null = null;
        let metaRef: any[] = [];
        // Hover picking throttling and drag gating
        let isDragging = false;
        let lastHoverId: number = -2;
        let lastMoveX = 0, lastMoveY = 0;
        let pickPending = false;
        let lastPickTs = 0;
        const HOVER_MIN_INTERVAL_MS = 120;
        const isFinePointer = typeof window !== 'undefined' && matchMedia('(pointer:fine)').matches;
        let cancelled = false;
        let expectedSatelliteCount = 0;

        isLoadingRef.current = true;
        setIsLoading(true);

        const markLoaded = () => {
            if (cancelled) {
                return;
            }
            if (isLoadingRef.current) {
                isLoadingRef.current = false;
                setIsLoading(false);
            }
        };

        // If instanced flag is on, load glue scripts early
        if (useInstanced) {
            const s1 = document.createElement('script'); s1.src = '/arcgis/instanced/renderer.js'; s1.async = true; document.head.appendChild(s1);
            const s2 = document.createElement('script'); s2.src = '/arcgis/instanced/customLayer.js'; s2.async = true; document.head.appendChild(s2);
        }


        function createTrackPolyline(pointsLngLatZ: number[][]) {
            return { type: 'polyline', paths: [pointsLngLatZ], spatialReference: { wkid: 4326 } } as const;
        }


        function start(Map: any, SceneView: any, GraphicsLayer: any, Graphic: any) {
            function scheduleHoverPick(x: number, y: number) {
                if (!instancedApi) return;
                lastMoveX = x; lastMoveY = y;
                if (pickPending) return;
                pickPending = true;
                requestAnimationFrame(() => {
                    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
                    const dt = now - lastPickTs;
                    if (dt < HOVER_MIN_INTERVAL_MS) {
                        setTimeout(() => { pickPending = false; scheduleHoverPick(lastMoveX, lastMoveY); }, HOVER_MIN_INTERVAL_MS - dt);
                        return;
                    }
                    lastPickTs = now;
                    const id = instancedApi!.pick(lastMoveX, lastMoveY);
                    if (id !== lastHoverId) {
                        lastHoverId = id;
                        if (id >= 0 && id !== selectedId) {
                            const html = tooltipService.generateSatelliteTooltip(id, true);
                            if (html) tooltipService.showTooltip(lastMoveX, lastMoveY, html);
                        } else {
                            tooltipService.hideTooltip();
                        }
                    }
                    pickPending = false;
                });
            }
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

            try { (view as any).padding = { top: 50 }; } catch (e) { }

            tracksLayer = new GraphicsLayer();
            map.add(tracksLayer);

            // If instanced, attach external renderer
            if (useInstanced) {
                const id = setInterval(() => {
                    if ((window as any).ArcgisInstanced && view) {
                        clearInterval(id);
                        try {
                            instancedApi = (window as any).ArcgisInstanced.create(view, {});
                            instancedApiRef.current = instancedApi;

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
                                            tooltipService.hideTooltip();
                                            // Clear selection in renderer
                                            instancedApi.setSelectedId(-1);
                                        }
                                        return;
                                    }

                                    if (id === selectedId) {
                                        // Clicked on same satellite - toggle off
                                        tracksLayer.removeAll();
                                        selectedId = null;
                                        tooltipService.hideTooltip();
                                        // Clear selection in renderer
                                        instancedApi.setSelectedId(-1);
                                    } else {
                                        // Clicked on different satellite - show orbit and info
                                        selectedId = id;
                                        // Highlight selected satellite in renderer
                                        instancedApi.setSelectedId(id);

                                        // Show satellite info tooltip
                                        const html = tooltipService.generateSatelliteTooltip(id, false);
                                        if (html) {
                                            tooltipService.showTooltip(evt.x, evt.y, html);
                                        }

                                        if (worker) {
                                            worker.postMessage({ type: 'track', id: id });
                                        }
                                    }
                                }, 50); // Small delay for stable picking
                            });

                            // Track drag state and throttle hover picking to mouse-only
                            view.on('pointer-down', () => { isDragging = true; });
                            view.on('pointer-up', () => { isDragging = false; });

                            // Hover handler for satellite info (mouse-only, throttled, not during drag)
                            view.on('pointer-move', (evt: any) => {
                                if (!instancedApi) return;
                                // Skip on touch/pen; only do hover for mouse/fine pointer
                                if ((evt.pointerType && evt.pointerType !== 'mouse') || !isFinePointer) return;
                                // Skip while dragging to keep navigation smooth
                                if (isDragging) return;
                                scheduleHoverPick(evt.x, evt.y);
                            });

                        } catch (e) { if (DEBUG) console.error('[ArcGlobe] instanced create failed', e); }
                    }
                }, 50);
            }


            view.when(() => {
                view.popup.autoOpenEnabled = false;


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


                    try {
                        // Store metadata reference for picking
                        metaRef = (datasets.main || []).slice(0, MAX_SATS);

                        // Convert to SatelliteData format and initialize service
                        const satelliteData: SatelliteData[] = metaRef.map((s: any, idx: number) => {
                            // Extract NORAD ID from TLE line 1 (first 5 digits after the '1' and space)
                            let noradId = 'N/A';
                            if (s.tle1 && s.tle1.length > 7) {
                                const noradMatch = s.tle1.match(/^1\s+(\d{5})/);
                                if (noradMatch) {
                                    noradId = noradMatch[1];
                                }
                            }

                            return {
                                id: idx,
                                name: s.name || 'SAT',
                                tle1: s.tle1,
                                tle2: s.tle2,
                                norad: noradId,
                                launchDate: s.launchDate || new Date().toISOString(),
                                country: s.country || 'TBD',
                                type: 1,
                                source: s.source || 'Unknown',
                                isUserCreated: false
                            };
                        });

                        expectedSatelliteCount = satelliteData.length;

                        // Use classic worker served from public to avoid bundler issues
                        try {
                            worker = new Worker('/arcgis/worker.js');
                            console.log('ArcGlobe: Worker created successfully');

                            // Add error handling for worker
                            worker.onerror = (error) => {
                                console.error('ArcGlobe: Worker error:', error);
                            };

                            worker.onmessageerror = (error) => {
                                console.error('ArcGlobe: Worker message error:', error);
                            };
                        } catch (error) {
                            console.error('ArcGlobe: Failed to create worker:', error);
                        }
                        const payload = satelliteData.map(s => ({
                            id: s.id,
                            name: s.name,
                            tle1: s.tle1,
                            tle2: s.tle2,
                            norad: s.norad,
                            launchDate: s.launchDate,
                            country: s.country
                        }));
                        if (worker) {
                            worker.postMessage({ type: 'init', payload });

                            // Test if worker is responding
                            setTimeout(() => {
                                console.log('ArcGlobe: Testing worker communication...');
                                if (worker) {
                                    worker.postMessage({ type: 'test', message: 'Hello worker' });
                                }
                            }, 1000);

                            // Initialize satellite service
                            satelliteService.initialize(satelliteData, worker);
                        }

                        if (worker) {
                            worker.onmessage = (ev: MessageEvent) => {
                                const data: any = ev.data || {};
                                if (data.type === 'log' && DEBUG) { console.log('[worker]', data.msg); return; }
                                // Ignore PV for now; renderer expects lon/lat/h. Use 'positions' path below.
                                if (data.type === 'positions' && data.positions) {
                                    const arr = data.positions instanceof Float32Array ? data.positions : new Float32Array(data.positions as ArrayBuffer);
                                    if (useInstanced && instancedApi) {
                                        const count = Math.floor(arr.length / 3);
                                        instancedApi.updatePositions(arr.buffer, count);
                                        if (expectedSatelliteCount > 0 && count >= expectedSatelliteCount && isLoadingRef.current) {
                                            requestAnimationFrame(() => {
                                                setTimeout(() => {
                                                    markLoaded();
                                                }, 150);
                                            });
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
                        }

                        setInterval(() => {
                            if (worker) worker.postMessage({ type: 'tick', time: Date.now() });
                        }, 1000);
                    } catch (e) {
                        console.error(e);
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
            cancelled = true;
            try { (view as any)?.destroy?.(); } catch { }
            try { worker?.terminate?.(); } catch { }
            try { tooltipService.dispose(); } catch { }
            setIsLoading(false);
            isLoadingRef.current = false;
        };
    }, []);

    return (
        <>
            <div id="viewDiv" ref={divRef} style={{ position: 'absolute', inset: 0 }} />
            {isLoading && (
                <div className="loading-overlay">
                    <div className="loading-card">
                        <div className="loading-spinner" />
                        <div className="loading-text">
                            <p>Loading Deepspace</p>
                            <p className="loading-subtext">Fetching orbital data and rendering satellites…</p>
                        </div>
                    </div>
                </div>
            )}
            <Header
                onFeatureSelect={handleFeatureSelect}
                selectedFeature={selectedFeature}
                onSearchSatellites={handleSearchSatellites}
                onShowUserCreated={handleShowUserCreated}
                onTestConstellations={handleTestConstellations}
            />
            <Footer
                isVisible={!!activeFeature}
                title={activeFeatureTitle}
                onClose={() => {
                    setShowCollisionAnalysis(false);
                    setShowCreateSatellite(false);
                    setShowConstellationAnalysis(false);
                    setShowDebrisScanner(false);
                    setSelectedFeature(null);
                }}
            >
                <FeatureHost active={activeFeature} />
            </Footer>
        </>
    );
};


