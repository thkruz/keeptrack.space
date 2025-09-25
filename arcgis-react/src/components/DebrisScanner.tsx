import React, { useEffect, useMemo, useState } from 'react';
import { SatelliteService, type SatelliteData } from '../services/satelliteService';
import './DebrisScanner.css';

export interface DebrisScannerProps {
    isVisible: boolean;
    onClose: () => void;
    getInstancedApi: () => any;
    satelliteService: SatelliteService;
}

type Vector3 = [number, number, number];

interface ScreenedObject {
    id: number;
    name: string;
    norad: string;
    distanceKm: number;
    relativeVelocity: number;
    position: Vector3;
    velocity: Vector3;
}

const radiusOptions = [
    { label: '0.25 km', u: 0.25, v: 10, w: 10 },
    { label: '0.50 km', u: 0.5, v: 25, w: 25 },
    { label: '0.75 km', u: 0.75, v: 25, w: 25 },
    { label: '1.00 km', u: 1, v: 30, w: 30 },
    { label: '1.25 km', u: 1.25, v: 35, w: 35 },
    { label: '1.50 km', u: 1.5, v: 40, w: 40 },
];

const durationOptions = [
    { label: '1 hour', value: 1 },
    { label: '4 hours', value: 4 },
    { label: '8 hours', value: 8 },
    { label: '24 hours', value: 24 },
    { label: '48 hours', value: 48 },
    { label: '72 hours', value: 72 },
];

const minuteSteps = [0, 1, 5, 10, 30, 60];

function subtractVectors(a: Vector3, b: Vector3): Vector3 {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function vectorLength(v: Vector3): number {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

function dot(a: Vector3, b: Vector3): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function computeRelativeVelocity(v1: Vector3, v2: Vector3): number {
    return vectorLength(subtractVectors(v1, v2));
}

function screenSatellites(
    primary: SatelliteData & { position?: Vector3; velocity?: Vector3 },
    all: (SatelliteData & { position?: Vector3; velocity?: Vector3 })[],
    radiusKm: Vector3,
    durationHours: number
): ScreenedObject[] {
    if (!primary.position || !primary.velocity) {
        return [];
    }

    const u = radiusKm[0] * 1000;
    const v = radiusKm[1] * 1000;
    const w = radiusKm[2] * 1000;

    const results: ScreenedObject[] = [];
    const primaryPos = primary.position;
    const primaryVel = primary.velocity;

    minuteSteps.forEach((step) => {
        if (step * 60 > durationHours * 3600) {
            return;
        }
        const scale = step * 60 * 1e-3;
        const futurePos: Vector3 = [
            primaryPos[0] + primaryVel[0] * scale,
            primaryPos[1] + primaryVel[1] * scale,
            primaryPos[2] + primaryVel[2] * scale,
        ];

        all.forEach((other) => {
            if (other.id === primary.id) {
                return;
            }
            if (!other.position || !other.velocity) {
                return;
            }

            const otherFuturePos: Vector3 = [
                other.position[0] + other.velocity[0] * scale,
                other.position[1] + other.velocity[1] * scale,
                other.position[2] + other.velocity[2] * scale,
            ];

            const relative = subtractVectors(otherFuturePos, futurePos);

            if (Math.abs(relative[0]) <= u && Math.abs(relative[1]) <= v && Math.abs(relative[2]) <= w) {
                const dist = vectorLength(relative) / 1000;
                const relVel = computeRelativeVelocity(primaryVel, other.velocity);

                results.push({
                    id: other.id,
                    name: other.name,
                    norad: other.norad,
                    distanceKm: dist,
                    relativeVelocity: relVel,
                    position: other.position,
                    velocity: other.velocity,
                });
            }
        });
    });

    const unique = new Map<number, ScreenedObject>();
    results.forEach((obj) => {
        if (!unique.has(obj.id) || unique.get(obj.id)!.distanceKm > obj.distanceKm) {
            unique.set(obj.id, obj);
        }
    });

    return Array.from(unique.values()).sort((a, b) => a.distanceKm - b.distanceKm);
}

export const DebrisScanner: React.FC<DebrisScannerProps> = ({ isVisible, onClose, getInstancedApi, satelliteService }) => {
    const [radiusIndex, setRadiusIndex] = useState(1);
    const [durationIndex, setDurationIndex] = useState(0);
    const [primaryId, setPrimaryId] = useState<number | null>(null);
    const [results, setResults] = useState<ScreenedObject[]>([]);
    const [isComputing, setIsComputing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [version, setVersion] = useState(0);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [pickerSearch, setPickerSearch] = useState('');
    const [pickerPage, setPickerPage] = useState(0);
    const [viewFiltered, setViewFiltered] = useState(false);

    const allSatellites = useMemo(() => satelliteService.getAllSatellites(), [satelliteService, version]);

    useEffect(() => {
        const unsubscribe = satelliteService.subscribe(() => {
            setVersion((prev) => prev + 1);
        });
        return unsubscribe;
    }, [satelliteService]);

    useEffect(() => {
        if (!isVisible) {
            setPickerSearch('');
            setPickerPage(0);
            setIsPickerOpen(false);
        }
    }, [isVisible]);

    useEffect(() => {
        if (!isVisible) {
            return;
        }

        const api = getInstancedApi();
        const first = allSatellites[0];
        if (!api) {
            setPrimaryId(first ? first.id : null);
            return;
        }

        const selected = api.getSelectedId?.() ?? null;
        if (selected !== null && selected >= 0 && selected < allSatellites.length) {
            setPrimaryId(selected);
        } else if (!primaryId && first) {
            setPrimaryId(first.id);
        }
    }, [isVisible, allSatellites, getInstancedApi, primaryId]);

    const filteredSatellites = useMemo(() => {
        const query = pickerSearch.trim().toLowerCase();
        if (!query) {
            return allSatellites;
        }
        return allSatellites.filter((sat) => {
            const name = sat.name.toLowerCase();
            const norad = sat.norad.toLowerCase();
            return name.includes(query) || norad.includes(query);
        });
    }, [allSatellites, pickerSearch]);

    const PAGE_SIZE = 50;
    const totalPages = Math.max(1, Math.ceil(filteredSatellites.length / PAGE_SIZE));
    const currentPage = Math.min(pickerPage, totalPages - 1);
    const pagedSatellites = filteredSatellites.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

    useEffect(() => {
        if (!isVisible) {
            setResults([]);
            setError(null);
        }
    }, [isVisible]);

    const handleScan = () => {
        if (primaryId === null) {
            setError('Select a satellite to analyze.');
            return;
        }
        const primary = allSatellites.find((sat) => sat.id === primaryId);
        if (!primary) {
            setError('Unable to locate selected satellite.');
            return;
        }

        setIsComputing(true);
        setError(null);

        try {
            const radius = [radiusOptions[radiusIndex].u, radiusOptions[radiusIndex].v, radiusOptions[radiusIndex].w] as Vector3;
            const duration = durationOptions[durationIndex].value;

            const api = getInstancedApi();
            if (!api || typeof api.getPositionSnapshot !== 'function') {
                setError('Position snapshot not available.');
                setIsComputing(false);
                return;
            }

            const snapshot = api.getPositionSnapshot();

            if (!snapshot || snapshot.count <= primaryId || !snapshot.positions) {
                setError('Position snapshot not available.');
                setIsComputing(false);
                return;
            }

            const decorated: (SatelliteData & { position?: Vector3; velocity?: Vector3 })[] = allSatellites.map((sat, idx) => {
                const baseIdx = idx * 3;
                const pos: Vector3 = [
                    snapshot.positions[baseIdx],
                    snapshot.positions[baseIdx + 1],
                    snapshot.positions[baseIdx + 2]
                ];
                const vel: Vector3 = snapshot.velocities
                    ? [snapshot.velocities[baseIdx], snapshot.velocities[baseIdx + 1], snapshot.velocities[baseIdx + 2]]
                    : [0, 0, 0];
                return {
                    ...sat,
                    position: pos,
                    velocity: vel
                };
            });

            const primaryDecorated = decorated.find((sat) => sat.id === primaryId);

            if (!primaryDecorated || !primaryDecorated.position || !primaryDecorated.velocity) {
                setError('Selected satellite does not have position data available.');
                setIsComputing(false);
                return;
            }

            const screened = screenSatellites(primaryDecorated as any, decorated as any, radius, duration);
            setResults(screened);

            if (api && typeof api.setSelectedId === 'function') {
                api.setSelectedId(primaryId);
            }
            if (api && typeof api.setVisibleSatellites === 'function') {
                const ids = screened.map((obj) => obj.id);
                api.setVisibleSatellites(ids, [1, 0.6, 0.2]);
                setViewFiltered(ids.length > 0);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to screen for debris.');
        } finally {
            setIsComputing(false);
        }
    };

    const handleResetView = () => {
        const api = getInstancedApi();
        setResults([]);
        setError(null);
        if (api && typeof api.resetVisibility === 'function') {
            api.resetVisibility();
        }
        setViewFiltered(false);
    };

    if (!isVisible) {
        return null;
    }

    const radiusSelection = radiusOptions[radiusIndex];
    const durationSelection = durationOptions[durationIndex];
    const primarySat = primaryId !== null ? allSatellites.find((sat) => sat.id === primaryId) : null;

    return (
        <div className="debris-scanner-overlay">
            <div className="debris-scanner-panel">
                <header className="panel-header">
                    <h2>Debris Scanner</h2>
                    <button className="close-button" onClick={onClose} aria-label="Close Debris Scanner">
                        ×
                    </button>
                </header>

                <div className="panel-content">
                    <section className="panel-section">
                        <h3>Search Parameters</h3>
                        <div className="field-grid">
                            <div className="field">
                                <span>Primary Satellite</span>
                                <button
                                    type="button"
                                    className="picker-trigger"
                                    onClick={() => setIsPickerOpen(true)}
                                >
                                    {primarySat ? (
                                        <>
                                            <strong>{primarySat.name}</strong>
                                            <span className="picker-subtext">NORAD {primarySat.norad}</span>
                                        </>
                                    ) : (
                                        <span>Select satellite</span>
                                    )}
                                </button>
                                <span className="picker-hint">{allSatellites.length.toLocaleString()} objects available</span>
                            </div>

                            <label className="field">
                                <span>Assessment Window</span>
                                <select value={durationIndex} onChange={(e) => setDurationIndex(Number(e.target.value))}>
                                    {durationOptions.map((option, idx) => (
                                        <option key={option.value} value={idx}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="field">
                                <span>Bounding Radius</span>
                                <select value={radiusIndex} onChange={(e) => setRadiusIndex(Number(e.target.value))}>
                                    {radiusOptions.map((option, idx) => (
                                        <option key={option.label} value={idx}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    </section>

                    <section className="panel-section">
                        <h3>Results</h3>
                        {isComputing ? (
                            <div className="status">Computing potential encounters…</div>
                        ) : error ? (
                            <div className="status error">{error}</div>
                        ) : results.length === 0 ? (
                            <div className="status">No debris objects detected for the selected parameters.</div>
                        ) : (
                            <div className="results-table">
                                <div className="table-header">
                                    <span>Name</span>
                                    <span>NORAD</span>
                                    <span>Distance (km)</span>
                                    <span>Relative Velocity (m/s)</span>
                                </div>
                                <div className="table-body">
                                    {results.map((obj) => (
                                        <button
                                            key={obj.id}
                                            className="table-row"
                                            onClick={() => {
                                                const api = getInstancedApi();
                                                if (api) {
                                                    api.setSelectedId?.(obj.id);
                                                }
                                            }}
                                        >
                                            <span>{obj.name}</span>
                                            <span>{obj.norad}</span>
                                            <span>{obj.distanceKm.toFixed(3)}</span>
                                            <span>{obj.relativeVelocity.toFixed(1)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                </div>

                <footer className="panel-footer">
                    <button className="btn primary" onClick={handleScan} disabled={isComputing}>
                        {isComputing ? 'Analyzing…' : 'Screen for Debris'}
                    </button>
                    <button className="btn secondary" onClick={handleResetView} disabled={!viewFiltered && results.length === 0}>
                        Reset View
                    </button>
                    <button className="btn secondary" onClick={onClose}>
                        Close
                    </button>
                </footer>
            </div>

            {isPickerOpen && (
                <div className="satellite-picker-overlay">
                    <div className="satellite-picker-panel">
                        <header className="picker-header">
                            <h3>Select Satellite</h3>
                            <button className="close-button" onClick={() => setIsPickerOpen(false)} aria-label="Close satellite picker">
                                ×
                            </button>
                        </header>
                        <div className="picker-content">
                            <input
                                className="picker-search"
                                type="search"
                                placeholder="Search by name or NORAD"
                                value={pickerSearch}
                                onChange={(e) => {
                                    setPickerSearch(e.target.value);
                                    setPickerPage(0);
                                }}
                                autoFocus
                            />
                            <div className="picker-list">
                                {pagedSatellites.length === 0 ? (
                                    <div className="picker-empty">No satellites match “{pickerSearch}”.</div>
                                ) : (
                                    pagedSatellites.map((sat, idx) => (
                                        <button
                                            key={sat.id}
                                            className={`picker-item ${sat.id === primaryId ? 'active' : ''}`}
                                            onClick={() => {
                                                setPrimaryId(sat.id);
                                                setIsPickerOpen(false);
                                            }}
                                        >
                                            <span className="picker-item-name">{sat.name}</span>
                                            <span className="picker-item-norad">NORAD {sat.norad}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                        <footer className="picker-footer">
                            <button
                                className="btn secondary"
                                onClick={() => setPickerPage((p) => Math.max(0, p - 1))}
                                disabled={currentPage === 0}
                            >
                                Previous
                            </button>
                            <span className="picker-page-indicator">
                                {pagedSatellites.length === 0
                                    ? 'No results'
                                    : `Page ${currentPage + 1} of ${totalPages}`}
                            </span>
                            <button
                                className="btn secondary"
                                onClick={() => setPickerPage((p) => Math.min(totalPages - 1, p + 1))}
                                disabled={currentPage >= totalPages - 1}
                            >
                                Next
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
};

