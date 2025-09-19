import React, { useEffect, useState } from 'react';
import './CollisionAnalysis.css';

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
    onClose: () => void;
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

    // Auto-refresh every 5 minutes when panel is visible
    useEffect(() => {
        if (!isVisible || !isAutoRefresh) return;

        const interval = setInterval(() => {
            fetchCollisionData(true); // Silent refresh
        }, 5 * 60 * 1000); // 5 minutes

        return () => clearInterval(interval);
    }, [isVisible, isAutoRefresh]);

    // Initial fetch when panel opens
    useEffect(() => {
        if (isVisible && collisions.length === 0) {
            fetchCollisionData();
        }
    }, [isVisible]);

    const fetchCollisionData = async (silent = false) => {
        if (!silent) {
            setLoading(true);
        }
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
            if (!silent) {
                setLoading(false);
            }
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

    const formatProbability = (prob: number) => {
        return (prob * 100).toFixed(6) + '%';
    };

    const formatDistance = (distance: number) => {
        if (distance < 1000) {
            return `${distance.toFixed(1)} m`;
        } else {
            return `${(distance / 1000).toFixed(1)} km`;
        }
    };

    const formatLastUpdated = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffSecs = Math.floor(diffMs / 1000);

        if (diffSecs < 60) {
            return `${diffSecs}s ago`;
        } else if (diffMins < 60) {
            return `${diffMins}m ago`;
        } else {
            return date.toLocaleTimeString();
        }
    };

    const handleAutoRefreshToggle = () => {
        setIsAutoRefresh(!isAutoRefresh);
    };

    if (!isVisible) return null;

    return (
        <div className="collision-analysis-overlay">
            <div className="collision-analysis-panel">
                <div className="panel-header">
                    <div className="header-left">
                        <h2>Collision Analysis</h2>
                        {lastUpdated && (
                            <div className="last-updated">
                                Last updated: {formatLastUpdated(lastUpdated)}
                            </div>
                        )}
                    </div>
                    <div className="header-right">
                        <button
                            className={`auto-refresh-toggle ${isAutoRefresh ? 'active' : ''}`}
                            onClick={handleAutoRefreshToggle}
                            title={isAutoRefresh ? 'Auto-refresh enabled (every 5 min)' : 'Auto-refresh disabled'}
                        >
                            🔄
                        </button>
                        <button className="close-button" onClick={onClose}>×</button>
                    </div>
                </div>

                <div className="panel-content">
                    {loading && (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p>Loading collision data from SOCRATES...</p>
                        </div>
                    )}

                    {error && (
                        <div className="error-state">
                            <p>Error: {error}</p>
                            <button onClick={() => fetchCollisionData()} className="retry-button">
                                Retry
                            </button>
                        </div>
                    )}

                    {!loading && !error && collisions.length === 0 && (
                        <div className="empty-state">
                            <p>No collision data available</p>
                            <button onClick={() => fetchCollisionData()} className="refresh-button">
                                Refresh
                            </button>
                        </div>
                    )}

                    {!loading && !error && collisions.length > 0 && (
                        <div className="collision-list">
                            <div className="list-header">
                                <div className="list-info">
                                    <p>Found {collisions.length} potential collisions</p>
                                    {isAutoRefresh && (
                                        <div className="auto-refresh-indicator">
                                            <span className="refresh-dot"></span>
                                            Auto-refresh enabled
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => fetchCollisionData()} className="refresh-button">
                                    Refresh
                                </button>
                            </div>

                            <div className="collision-table">
                                <div className="table-header">
                                    <div className="col-satellites">Satellites</div>
                                    <div className="col-toca">TOCA</div>
                                    <div className="col-distance">Min Range</div>
                                    <div className="col-probability">Probability</div>
                                    <div className="col-speed">Rel Speed</div>
                                </div>

                                {collisions.map((collision) => (
                                    <div
                                        key={collision.ID}
                                        className={`collision-row ${selectedCollision?.ID === collision.ID ? 'selected' : ''}`}
                                        onClick={() => handleCollisionClick(collision)}
                                    >
                                        <div className="col-satellites">
                                            <div className="satellite-pair">
                                                <div className="satellite-name">{collision.SAT1_NAME}</div>
                                                <div className="satellite-norad">NORAD: {collision.SAT1}</div>
                                                <div className="vs-separator">vs</div>
                                                <div className="satellite-name">{collision.SAT2_NAME}</div>
                                                <div className="satellite-norad">NORAD: {collision.SAT2}</div>
                                            </div>
                                        </div>
                                        <div className="col-toca">
                                            {formatDate(collision.TOCA)}
                                        </div>
                                        <div className="col-distance">
                                            {formatDistance(collision.MIN_RNG)}
                                        </div>
                                        <div className="col-probability">
                                            <span className={`probability ${collision.MAX_PROB > 0.01 ? 'high' : collision.MAX_PROB > 0.001 ? 'medium' : 'low'}`}>
                                                {formatProbability(collision.MAX_PROB)}
                                            </span>
                                        </div>
                                        <div className="col-speed">
                                            {collision.REL_SPEED.toFixed(1)} m/s
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="panel-footer">
                    <p className="data-source">
                        Data provided by <a href="https://celestrak.org/SOCRATES/" target="_blank" rel="noopener noreferrer">SOCRATES</a>
                    </p>
                </div>
            </div>
        </div>
    );
};
