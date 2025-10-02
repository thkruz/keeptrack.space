import React, { useEffect, useState } from 'react';
import '~/styles/features/ConstellationAnalysis.css';
import { SatelliteService } from '../../services/satelliteService';

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
            const allSatellites = satelliteService.getAllSatellites();
            const groupedConstellations = groupSatellitesByOrbit(allSatellites);
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
                const tle2 = satellite.tle2;
                const inclination = parseFloat(tle2.substring(8, 16));
                const raan = parseFloat(tle2.substring(17, 25));
                const eccentricity = parseFloat(tle2.substring(26, 33)) / 10000000;
                const argPerigee = parseFloat(tle2.substring(34, 42));
                const meanAnomaly = parseFloat(tle2.substring(43, 51));
                const meanMotion = parseFloat(tle2.substring(52, 63));

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

            if (satellites.length < 2) continue;

            const avgInclination = satellites.reduce((sum, s) => sum + s.inclination, 0) / satellites.length;
            const avgRaan = satellites.reduce((sum, s) => sum + s.raan, 0) / satellites.length;
            const avgMeanMotion = satellites.reduce((sum, s) => sum + s.meanMotion, 0) / satellites.length;

            const period = 1440 / avgMeanMotion;
            const altitude = Math.pow(398600.4418 / Math.pow(avgMeanMotion * Math.PI / 720, 2), 1 / 3) - 6378.137;
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
            setAnalysisProgress(((index + 1) / totalGroups) * 100);

            if (index % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        return constellations;
    };

    const handleConstellationSelect = (constellation: Constellation) => {
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
        <div className="constellation-analysis">
            <div className="constellation-analysis__header">
                <div>
                    <h2>Constellation Analysis</h2>
                    <p className="constellation-analysis__subtitle">Group satellites by orbital characteristics</p>
                </div>
                {selectedConstellation && (
                    <button className="clear-highlight-btn" onClick={handleClearHighlight}>
                        Clear Highlight
                    </button>
                )}
            </div>

            <div className="constellation-analysis__body">
                {isAnalyzing ? (
                    <div className="analysis-progress">
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${analysisProgress}%` }} />
                        </div>
                        <p>Analyzing constellations... {Math.round(analysisProgress)}%</p>
                    </div>
                ) : (
                    <div className="constellations-list">
                        <h3>Detected Constellations ({constellations.length})</h3>
                        {constellations.map((constellation) => (
                            <button
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
                                    <span>{constellation.coverage}% coverage</span>
                                    <div className="coverage-bar">
                                        <div className="coverage-fill" style={{ width: `${constellation.coverage}%` }} />
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
