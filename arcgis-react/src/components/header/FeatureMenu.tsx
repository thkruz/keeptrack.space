import React, { useEffect, useRef, useState } from 'react';
import '~/styles/features/FeatureMenu.css';

export type MenuTab = 'basic' | 'advanced' | 'analysis';

interface FeatureMenuProps {
    onFeatureSelect: (feature: string) => void;
    selectedFeature: string | null;
    onSearchSatellites?: (query: string) => void;
    onShowUserCreated?: () => void;
    onTestConstellations?: () => void;
    isOpen?: boolean;
}

export const FeatureMenu: React.FC<FeatureMenuProps> = ({
    onFeatureSelect,
    selectedFeature,
    onSearchSatellites,
    onShowUserCreated,
    onTestConstellations,
    isOpen = false
}) => {
    const [activeTab, setActiveTab] = useState<MenuTab>('basic');
    const [isAnimating, setIsAnimating] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // When opened, focus search after animation
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 300);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isAnimating) {
            const t = setTimeout(() => setIsAnimating(false), 300);
            return () => clearTimeout(t);
        }
    }, [isAnimating]);

    const menuItems = {
        basic: [
            { id: 'collision', name: 'Collision Analysis', icon: '⚠️', description: 'View potential satellite collisions' },
            { id: 'create-satellite', name: 'Create Satellite', icon: '🛰️', description: 'Add new satellite to simulation' },
            { id: 'test-constellations', name: 'Test Constellations', icon: '🌌', description: 'Analyze satellite constellations' },
            { id: 'new-launch', name: 'New Launch', icon: '🚀', description: 'Simulate satellite launch' }
        ],
        advanced: [
            { id: 'create-breakup', name: 'Create Breakup', icon: '💥', description: 'Simulate satellite breakup event' }
        ],
        analysis: [
            { id: 'debris-scanner', name: 'Debris Scanner', icon: '🔍', description: 'Analyze debris in orbital regions' }
        ]
    } as const;

    const handleFeatureClick = (featureId: string) => {
        if (featureId === 'test-constellations') {
            if (onTestConstellations) onTestConstellations();
        } else {
            onFeatureSelect(featureId);
        }
    };

    const handleTabClick = (tab: MenuTab) => setActiveTab(tab);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (onSearchSatellites) onSearchSatellites(query);
    };

    const handleShowUserCreated = () => {
        if (onShowUserCreated) onShowUserCreated();
    };

    if (!isOpen) return null;

    return (
        <div
            ref={menuRef}
            className={`feature-menu expanded ${isAnimating ? 'animating' : ''}`}
        >
            {/* Menu Content */}
            <div className="menu-content">
                {/* Tab Navigation */}
                <div className="menu-tabs">
                    <button
                        className={`tab ${activeTab === 'basic' ? 'active' : ''}`}
                        onClick={() => handleTabClick('basic')}
                    >
                        Basic
                    </button>
                    <button
                        className={`tab ${activeTab === 'advanced' ? 'active' : ''}`}
                        onClick={() => handleTabClick('advanced')}
                    >
                        Advanced
                    </button>
                    <button
                        className={`tab ${activeTab === 'analysis' ? 'active' : ''}`}
                        onClick={() => handleTabClick('analysis')}
                    >
                        Analysis
                    </button>
                </div>

                {/* Search Section */}
                <div className="search-section">
                    <div className="search-input-container">
                        <input
                            type="text"
                            placeholder="Search satellites..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            className="search-input"
                            ref={searchInputRef}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && searchQuery.trim()) {
                                    if (onSearchSatellites) onSearchSatellites(searchQuery);
                                }
                            }}
                        />
                        <div className="search-icon">🔍</div>
                    </div>
                    <button
                        className="show-user-created-btn"
                        onClick={handleShowUserCreated}
                    >
                        Show My Satellites
                    </button>
                </div>

                {/* Feature List */}
                <div className="feature-list">
                    {menuItems[activeTab].map((item) => (
                        <div
                            key={item.id}
                            className={`feature-item ${selectedFeature === item.id ? 'selected' : ''}`}
                            onClick={() => handleFeatureClick(item.id)}
                            role="button"
                            tabIndex={0}
                        >
                            <div className="feature-icon">{item.icon}</div>
                            <div className="feature-info">
                                <div className="feature-name">{item.name}</div>
                                <div className="feature-description">{item.description}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


