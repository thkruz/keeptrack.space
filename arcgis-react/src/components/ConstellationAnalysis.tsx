import React, { useEffect, useState } from 'react';
import { SatelliteService } from '../services/satelliteService';
import './ConstellationAnalysis.css';

export interface Constellation {
    id: string;
    name: string;
    satellites: any[];
    orbitalPlane: number;
    inclination: number;
    altitude: number;
    period: number;
    coverage: number;
}

export interface ConstellationAnalysisProps {
    isVisible: boolean;
    onClose: () => void;
    onConstellationSelect: (constellation: Constellation) => void;
    onConstellationHighlight: (constellation: Constellation | null, interaction?: 'hover' | 'select' | 'clear') => void;
}

export const ConstellationAnalysis: React.FC<ConstellationAnalysisProps> = ({
    isVisible,
    onClose,
    onConstellationSelect,
    onConstellationHighlight
}) => {
    const [constellations, setConstellations] = useState<Constellation[]>([]);
    const [selectedConstellation, setSelectedConstellation] = useState<Constellation | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisProgress, setAnalysisProgress] = useState(0);
    const [isMinimized, setIsMinimized] = useState(false);

    const satelliteService = SatelliteService.getInstance();

    useEffect(() => {
        if (isVisible) {
            analyzeConstellations();
        }
    }, [isVisible]);

    const analyzeConstellations = async () => {
        setIsAnalyzing(true);
        setAnalysisProgress(0);

        try {
            // Get all satellites
            const allSatellites = satelliteService.getAllSatellites();

            // Group satellites by similar orbital characteristics
            const groupedConstellations = groupSatellitesByOrbit(allSatellites);

            // Analyze each group
            const analyzedConstellations = await analyzeConstellationGroups(groupedConstellations);

            setConstellations(analyzedConstellations);
        } catch (error) {
            console.error('Error analyzing constellations:', error);
        } finally {
            setIsAnalyzing(false);
            setAnalysisProgress(100);
        }
    };

    const groupSatellitesByOrbit = (satellites: any[]) => {
        const groups: { [key: string]: any[] } = {};

        satellites.forEach(satellite => {
            if (!satellite.tle1 || !satellite.tle2) return;

            try {
                // Extract orbital elements from TLE
                const tle2 = satellite.tle2;

                // Parse TLE data
                const inclination = parseFloat(tle2.substring(8, 16));
                const raan = parseFloat(tle2.substring(17, 25));
                const eccentricity = parseFloat(tle2.substring(26, 33)) / 10000000;
                const argPerigee = parseFloat(tle2.substring(34, 42));
                const meanAnomaly = parseFloat(tle2.substring(43, 51));
                const meanMotion = parseFloat(tle2.substring(52, 63));

                // Group by similar orbital characteristics
                const groupKey = `${Math.round(inclination)}_${Math.round(raan)}_${Math.round(meanMotion * 1000)}`;

                if (!groups[groupKey]) {
                    groups[groupKey] = [];
                }

                groups[groupKey].push({
                    ...satellite,
                    inclination,
                    raan,
                    eccentricity,
                    argPerigee,
                    meanAnomaly,
                    meanMotion
                });
            } catch (error) {
                console.warn('Error parsing TLE for satellite:', satellite.name, error);
            }
        });

        return groups;
    };

    const analyzeConstellationGroups = async (groups: { [key: string]: any[] }) => {
        const constellations: Constellation[] = [];
        const groupEntries = Object.entries(groups);
        const totalGroups = groupEntries.length;

        for (let index = 0; index < groupEntries.length; index++) {
            const [, satellites] = groupEntries[index];

            if (satellites.length < 2) continue; // Skip single satellites

            // Calculate constellation properties
            const avgInclination = satellites.reduce((sum, s) => sum + s.inclination, 0) / satellites.length;
            const avgRaan = satellites.reduce((sum, s) => sum + s.raan, 0) / satellites.length;
            const avgMeanMotion = satellites.reduce((sum, s) => sum + s.meanMotion, 0) / satellites.length;

            // Calculate orbital period and altitude
            const period = 1440 / avgMeanMotion; // minutes
            const altitude = Math.pow(398600.4418 / Math.pow(avgMeanMotion * Math.PI / 720, 2), 1 / 3) - 6378.137; // km

            // Calculate coverage (simplified)
            const coverage = Math.min(100, satellites.length * 10);

            const constellation: Constellation = {
                id: `constellation_${index}`,
                name: `Constellation ${index + 1}`,
                satellites,
                orbitalPlane: avgRaan,
                inclination: avgInclination,
                altitude: altitude,
                period: period,
                coverage: coverage
            };

            constellations.push(constellation);

            // Update progress and yield control to prevent freezing
            setAnalysisProgress(((index + 1) / totalGroups) * 100);

            // Yield control to the browser every 10 constellations
            if (index % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        return constellations;
    };

    const handleConstellationSelect = (constellation: Constellation) => {
        // Toggle behavior: if clicking the same constellation, clear it
        if (selectedConstellation?.id === constellation.id) {
            handleClearHighlight();
        } else {
            setSelectedConstellation(constellation);
            onConstellationSelect(constellation);
            onConstellationHighlight(constellation, 'select');
        }
    };

    const handleConstellationHover = (constellation: Constellation | null) => {
        onConstellationHighlight(constellation, 'hover');
    };

    const handleClearHighlight = () => {
        setSelectedConstellation(null);
        onConstellationHighlight(null, 'clear');
    };

    if (!isVisible) return null;

    return (
        <div className="constellation-analysis-overlay">
            <div className={`constellation-analysis-modal ${isMinimized ? 'minimized' : ''}`} style={{ pointerEvents: 'auto' }}>
                <div className="constellation-analysis-header">
                    <h2>Constellation Analysis</h2>
                    <div className="header-buttons">
                        <button
                            className="minimize-button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMinimized(!isMinimized);
                            }}
                        >
                            {isMinimized ? '▲' : '▼'}
                        </button>
                        <button className="close-button" onClick={onClose}>×</button>
                    </div>
                </div>

                {selectedConstellation && (
                    <div className="constellation-status">
                        <div className="status-indicator">
                            <div className="status-dot"></div>
                            <span>Highlighting: {selectedConstellation.name}</span>
                        </div>
                        <button
                            className="clear-highlight-btn"
                            onClick={handleClearHighlight}
                        >
                            Clear Highlight
                        </button>
                    </div>
                )}

                <div className="constellation-analysis-content">
                    {isAnalyzing ? (
                        <div className="analysis-progress">
                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{ width: `${analysisProgress}%` }}
                                />
                            </div>
                            <p>Analyzing constellations... {Math.round(analysisProgress)}%</p>
                        </div>
                    ) : (
                        <div className="constellations-list">
                            <h3>Detected Constellations ({constellations.length})</h3>
                            {constellations.map((constellation) => (
                                <div
                                    key={constellation.id}
                                    className={`constellation-item ${selectedConstellation?.id === constellation.id ? 'selected' : ''}`}
                                    onClick={() => handleConstellationSelect(constellation)}
                                    onMouseEnter={() => handleConstellationHover(constellation)}
                                    onMouseLeave={() => handleConstellationHover(null)}
                                >
                                    <div className="constellation-info">
                                        <h4>{constellation.name}</h4>
                                        <div className="constellation-stats">
                                            <span>Satellites: {constellation.satellites.length}</span>
                                            <span>Inclination: {constellation.inclination.toFixed(1)}°</span>
                                            <span>Altitude: {constellation.altitude.toFixed(0)} km</span>
                                            <span>Period: {constellation.period.toFixed(1)} min</span>
                                        </div>
                                    </div>
                                    <div className="constellation-coverage">
                                        <div className="coverage-bar">
                                            <div
                                                className="coverage-fill"
                                                style={{ width: `${constellation.coverage}%` }}
                                            />
                                        </div>
                                        <span>{constellation.coverage.toFixed(0)}% coverage</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {selectedConstellation && (
                    <div className="constellation-details">
                        <h3>Constellation Details</h3>
                        <div className="details-grid">
                            <div className="detail-item">
                                <label>Name:</label>
                                <span>{selectedConstellation.name}</span>
                            </div>
                            <div className="detail-item">
                                <label>Satellites:</label>
                                <span>{selectedConstellation.satellites.length}</span>
                            </div>
                            <div className="detail-item">
                                <label>Inclination:</label>
                                <span>{selectedConstellation.inclination.toFixed(2)}°</span>
                            </div>
                            <div className="detail-item">
                                <label>RAAN:</label>
                                <span>{selectedConstellation.orbitalPlane.toFixed(2)}°</span>
                            </div>
                            <div className="detail-item">
                                <label>Altitude:</label>
                                <span>{selectedConstellation.altitude.toFixed(0)} km</span>
                            </div>
                            <div className="detail-item">
                                <label>Period:</label>
                                <span>{selectedConstellation.period.toFixed(1)} minutes</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
