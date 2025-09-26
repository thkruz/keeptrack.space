import React, { useState } from 'react';
import { FeatureMenu } from './FeatureMenu.tsx';

interface HeaderProps {
    onFeatureSelect: (feature: string) => void;
    selectedFeature: string | null;
    onSearchSatellites?: (query: string) => void;
    onShowUserCreated?: () => void;
    onTestConstellations?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
    onFeatureSelect,
    selectedFeature,
    onSearchSatellites,
    onShowUserCreated,
    onTestConstellations
}) => {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <>
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 12px',
                    background: 'rgba(15, 15, 15, 0.95)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
                    zIndex: 1100,
                    backdropFilter: 'blur(10px)'
                }}
            >
                {/* Left: Menu toggle */}
                <button
                    aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                    onClick={() => setMenuOpen(!menuOpen)}
                    style={{
                        height: 36,
                        width: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        borderRadius: 8,
                        padding: 0
                    }}
                >
                    <div style={{ position: 'relative', width: 20, height: 20 }}>
                        {/* Three lines that morph into an X */}
                        <span
                            style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: 2,
                                height: 2,
                                background: '#4CAF50',
                                borderRadius: 1,
                                transform: menuOpen ? 'rotate(45deg) translate(3px, 3px)' : 'none',
                                transition: 'transform 0.2s ease, opacity 0.2s ease'
                            }}
                        />
                        <span
                            style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: 9,
                                height: 2,
                                background: '#4CAF50',
                                borderRadius: 1,
                                opacity: menuOpen ? 0 : 1,
                                transition: 'opacity 0.2s ease'
                            }}
                        />
                        <span
                            style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                bottom: 2,
                                height: 2,
                                background: '#4CAF50',
                                borderRadius: 1,
                                transform: menuOpen ? 'rotate(-45deg) translate(4px, -4px)' : 'none',
                                transition: 'transform 0.2s ease'
                            }}
                        />
                    </div>
                </button>

                {/* Right: ArcGIS controls slot */}
                <div
                    id="arcgis-controls-right"
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                />
            </div>

            {/* Feature menu panel below header, top-left */}
            {menuOpen && (
                <FeatureMenu
                    isOpen={true}
                    onFeatureSelect={onFeatureSelect}
                    selectedFeature={selectedFeature}
                    onSearchSatellites={onSearchSatellites}
                    onShowUserCreated={onShowUserCreated}
                    onTestConstellations={onTestConstellations}
                />
            )}
        </>
    );
};


