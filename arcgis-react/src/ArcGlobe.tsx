import React, { useEffect, useRef, useState } from 'react';
import { CollisionAnalysis, type CollisionEvent } from './components/CollisionAnalysis';
import { ConstellationAnalysis, type Constellation } from './components/ConstellationAnalysis';
import { CreateSatellite, type SatelliteFormData } from './components/CreateSatellite';
import { FeatureMenu } from './components/FeatureMenu';
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
    const satelliteService = SatelliteService.getInstance();
    const tooltipService = TooltipService.getInstance();

    // Menu state
    const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
    const [showCollisionAnalysis, setShowCollisionAnalysis] = useState(false);
    const [showCreateSatellite, setShowCreateSatellite] = useState(false);
    const [showConstellationAnalysis, setShowConstellationAnalysis] = useState(false);

    // Feature handlers
    const handleFeatureSelect = (feature: string) => {
        setSelectedFeature(feature);

        switch (feature) {
            case 'collision':
                setShowCollisionAnalysis(true);
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
                // TODO: Implement debris scanner
                console.log('Debris Scanner feature selected');
                break;
            default:
                break;
        }
    };

    const handleCollisionSelect = (collision: CollisionEvent) => {
        console.log('Collision selected:', collision);
        // TODO: Highlight collision on globe, show details
    };

    const handleCloseCollisionAnalysis = () => {
        setShowCollisionAnalysis(false);
        setSelectedFeature(null);
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
    };

    const handleConstellationSelect = (constellation: Constellation) => {
        console.log('Constellation selected:', constellation);
    };

    const handleConstellationHighlight = (constellation: Constellation | null) => {
        // Highlight constellation satellites on the globe
        if (constellation && instancedApiRef.current) {
            const satelliteIds = constellation.satellites.map(sat => sat.id);
            instancedApiRef.current.setHighlightedSatellites(satelliteIds);
            console.log(`Highlighting constellation ${constellation.name} with ${satelliteIds.length} satellites`);
        } else if (instancedApiRef.current) {
            instancedApiRef.current.setHighlightedSatellites([]);
            console.log('Clearing constellation highlight');
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
        let hoverTimeout: number | null = null;

        // If instanced flag is on, load glue scripts early
        if (useInstanced) {
            const s1 = document.createElement('script'); s1.src = '/arcgis/instanced/renderer.js'; s1.async = true; document.head.appendChild(s1);
            const s2 = document.createElement('script'); s2.src = '/arcgis/instanced/customLayer.js'; s2.async = true; document.head.appendChild(s2);
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
                    lighting: { date: new Date(), directShadowsEnabled: true },
                    atmosphereEnabled: true,
                    starsEnabled: true,
                },
                popup: { dockEnabled: true, dockOptions: { breakpoint: false } },
            });

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
                                    if (id >= 0 && id !== selectedId) {
                                        const html = tooltipService.generateSatelliteTooltip(id, true);
                                        if (html) {
                                            tooltipService.showTooltip(evt.x, evt.y, html);
                                        }
                                    } else if (id < 0) {
                                        // Hide tooltip when not hovering over satellite
                                        tooltipService.hideTooltip();
                                    }
                                }, 150); // Increased debounce time from 100ms to 150ms
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
                                        instancedApi.updatePositions(arr.buffer, Math.floor(arr.length / 3));
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
            try { (view as any)?.destroy?.(); } catch { }
            try { worker?.terminate?.(); } catch { }
            try { if (hoverTimeout) clearTimeout(hoverTimeout); } catch { }
            try { tooltipService.dispose(); } catch { }
        };
    }, []);

    return (
        <>
            <div id="viewDiv" ref={divRef} style={{ position: 'absolute', inset: 0 }} />
            <FeatureMenu
                onFeatureSelect={handleFeatureSelect}
                selectedFeature={selectedFeature}
                onSearchSatellites={handleSearchSatellites}
                onShowUserCreated={handleShowUserCreated}
                onTestConstellations={handleTestConstellations}
            />
            <CollisionAnalysis
                isVisible={showCollisionAnalysis}
                onClose={handleCloseCollisionAnalysis}
                onCollisionSelect={handleCollisionSelect}
            />
            <CreateSatellite
                isVisible={showCreateSatellite}
                onClose={handleCloseCreateSatellite}
                onSatelliteCreated={handleSatelliteCreated}
            />
            <ConstellationAnalysis
                isVisible={showConstellationAnalysis}
                onClose={handleCloseConstellationAnalysis}
                onConstellationSelect={handleConstellationSelect}
                onConstellationHighlight={handleConstellationHighlight}
            />
        </>
    );
};


