import React, { useState } from 'react';
import { FeatureMenu } from './FeatureMenu.tsx';
import { FilterPanel, type FilterCriteria } from './FilterPanel';

interface HeaderProps {
    onFeatureSelect: (feature: string) => void;
    selectedFeature: string | null;
    onSearchSatellites?: (query: string) => void;
    onShowUserCreated?: () => void;
    onTestConstellations?: () => void;
    isFilterOpen: boolean;
    onToggleFilters: (nextOpen: boolean) => void;
    onApplyFilters: (criteria: FilterCriteria) => void;
}

export const Header: React.FC<HeaderProps> = ({
    onFeatureSelect,
    selectedFeature,
    onSearchSatellites,
    onShowUserCreated,
    onTestConstellations,
    isFilterOpen,
    onToggleFilters,
    onApplyFilters
}) => {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <>
            <div className="app-header">
                {/* Left: Menu toggle + Filters */}
                <div className="header-left">
                    <button
                        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                        onClick={() => {
                            setMenuOpen((prev) => {
                                const next = !prev;
                                if (next) {
                                    onToggleFilters(false);
                                }
                                return next;
                            });
                        }}
                        className="header-icon-button"
                    >
                        <div className="menu-toggle-icon">
                            <span className={menuOpen ? 'line top open' : 'line top'} />
                            <span className={menuOpen ? 'line middle open' : 'line middle'} />
                            <span className={menuOpen ? 'line bottom open' : 'line bottom'} />
                        </div>
                    </button>

                </div>

                {/* Right: ArcGIS controls slot + Filters */}
                <div className="header-right">
                    <div id="arcgis-controls-right" className="header-controls-slot" />
                    <button
                        className={`header-filter-button${isFilterOpen ? ' active' : ''}`}
                        type="button"
                        title="Filter satellites"
                        onClick={() => {
                            const willOpen = !isFilterOpen;
                            if (willOpen) {
                                setMenuOpen(false);
                            }
                            onToggleFilters(willOpen);
                        }}
                    >
                        <span className="filter-icon">⛭</span>
                        <span>Filters</span>
                    </button>
                </div>
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
                    onClose={() => setMenuOpen(false)}
                />
            )}

            <FilterPanel
                isOpen={isFilterOpen}
                countries={[
                    'USA',
                    'Russia',
                    'China',
                    'India',
                    'Japan',
                    'France',
                    'UK'
                ]}
                initialCriteria={{}}
                onApply={onApplyFilters}
                onClose={() => onToggleFilters(false)}
            />
        </>
    );
};


