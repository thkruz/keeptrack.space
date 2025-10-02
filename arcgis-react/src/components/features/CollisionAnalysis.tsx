import React, { useEffect, useState } from 'react';
import '~/styles/features/CollisionAnalysis.css';

export interface CollisionEvent {
    ID: number;
    SAT1: number;
    SAT1_NAME: string;
    SAT1_STATUS: string;
    SAT2: number;
    SAT2_NAME: string;
    SAT2_STATUS: string;
    SAT1_AGE_OF_TLE: number;
    SAT2_AGE_OF_TLE: number;
    TOCA: string;
    MIN_RNG: number;
    DILUTION_THRESHOLD: number;
    REL_SPEED: number;
    MAX_PROB: number;
}

interface CollisionAnalysisProps {
    isVisible: boolean;
    onClose: () => void; // retained for compatibility but handled externally
    onCollisionSelect: (collision: CollisionEvent) => void;
}

export const CollisionAnalysis: React.FC<CollisionAnalysisProps> = ({
    isVisible,
    onClose,
    onCollisionSelect
}) => {
    const [collisions, setCollisions] = useState<CollisionEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedCollision, setSelectedCollision] = useState<CollisionEvent | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isAutoRefresh, setIsAutoRefresh] = useState(true);

    const SOCRATES_API_URL = 'https://api.keeptrack.space/v2/socrates/latest';

    useEffect(() => {
        if (!isVisible) return;

        if (isAutoRefresh) {
            const interval = setInterval(() => fetchCollisionData(true), 5 * 60 * 1000);
            return () => clearInterval(interval);
        }
    }, [isVisible, isAutoRefresh]);

    useEffect(() => {
        if (isVisible && collisions.length === 0) {
            fetchCollisionData();
        }
    }, [isVisible]);

    const fetchCollisionData = async (silent = false) => {
        if (!silent) setLoading(true);
        setError(null);

        try {
            const response = await fetch(SOCRATES_API_URL);
            if (!response.ok) {
                throw new Error(`Failed to fetch collision data: ${response.status}`);
            }

            const data: CollisionEvent[] = await response.json();
            setCollisions(data);
            setLastUpdated(new Date());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch collision data');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleCollisionClick = (collision: CollisionEvent) => {
        setSelectedCollision(collision);
        onCollisionSelect(collision);
    };

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleString();
        } catch {
            return dateString;
        }
    };

    const formatProbability = (prob: number) => `${(prob * 100).toFixed(6)}%`;

    const formatDistance = (distance: number) => {
        if (distance < 1000) return `${distance.toFixed(1)} m`;
        return `${(distance / 1000).toFixed(1)} km`;
    };

    const formatLastUpdated = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffSecs = Math.floor(diffMs / 1000);

        if (diffSecs < 60) return `${diffSecs}s ago`;
        if (diffMins < 60) return `${diffMins}m ago`;
        return date.toLocaleTimeString();
    };

    if (!isVisible) return null;

    return (
        <div className="collision-analysis">
            <div className="collision-analysis__header">
                <div>
                    <h2>Collision Analysis</h2>
                    {lastUpdated && <span className="collision-analysis__updated">Last updated {formatLastUpdated(lastUpdated)}</span>}
                </div>
                <div className="collision-analysis__actions">
                    <button
                        className={`auto-refresh-toggle ${isAutoRefresh ? 'active' : ''}`}
                        onClick={() => setIsAutoRefresh((v) => !v)}
                        title={isAutoRefresh ? 'Auto-refresh enabled (every 5 min)' : 'Enable auto-refresh'}
                    >
                        🔄
                    </button>
                    <button className="refresh-button" onClick={() => fetchCollisionData()}>
                        Refresh
                    </button>
                </div>
            </div>

            <div className="collision-analysis__body">
                {loading && (
                    <div className="collision-analysis__state">
                        <div className="spinner" />
                        <p>Loading collision data...</p>
                    </div>
                )}

                {error && (
                    <div className="collision-analysis__state">
                        <p>Error: {error}</p>
                        <button className="retry-button" onClick={() => fetchCollisionData()}>Retry</button>
                    </div>
                )}

                {!loading && !error && collisions.length === 0 && (
                    <div className="collision-analysis__state">
                        <p>No collision data available.</p>
                        <button className="refresh-button" onClick={() => fetchCollisionData()}>Refresh</button>
                    </div>
                )}

                {!loading && !error && collisions.length > 0 && (
                    <div className="collision-table">
                        <div className="table-header">
                            <div className="col-satellites">Satellites</div>
                            <div className="col-toca">TOCA</div>
                            <div className="col-distance">Min Range</div>
                            <div className="col-probability">Probability</div>
                            <div className="col-speed">Rel Speed</div>
                        </div>
                        <div className="table-body">
                            {collisions.map((collision) => (
                                <button
                                    key={collision.ID}
                                    className={`collision-row ${selectedCollision?.ID === collision.ID ? 'selected' : ''}`}
                                    onClick={() => handleCollisionClick(collision)}
                                >
                                    <div className="col-satellites">
                                        <div className="satellite-name">{collision.SAT1_NAME}</div>
                                        <div className="satellite-norad">NORAD: {collision.SAT1}</div>
                                        <div className="vs-separator">vs</div>
                                        <div className="satellite-name">{collision.SAT2_NAME}</div>
                                        <div className="satellite-norad">NORAD: {collision.SAT2}</div>
                                    </div>
                                    <div className="col-toca">{formatDate(collision.TOCA)}</div>
                                    <div className="col-distance">{formatDistance(collision.MIN_RNG)}</div>
                                    <div className="col-probability">
                                        <span className={`probability ${collision.MAX_PROB > 0.01 ? 'high' : collision.MAX_PROB > 0.001 ? 'medium' : 'low'}`}>
                                            {formatProbability(collision.MAX_PROB)}
                                        </span>
                                    </div>
                                    <div className="col-speed">{collision.REL_SPEED.toFixed(1)} m/s</div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <footer className="collision-analysis__footer">
                Data provided by{' '}
                <a href="https://celestrak.org/SOCRATES/" target="_blank" rel="noopener noreferrer">
                    SOCRATES
                </a>
            </footer>
        </div>
    );
};


