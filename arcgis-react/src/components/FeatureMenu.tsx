import React, { useState } from 'react';
import './FeatureMenu.css';

export type MenuTab = 'basic' | 'advanced' | 'analysis';

interface FeatureMenuProps {
    onFeatureSelect: (feature: string) => void;
    selectedFeature: string | null;
    onSearchSatellites?: (query: string) => void;
    onShowUserCreated?: () => void;
    onTestConstellations?: () => void;
}

export const FeatureMenu: React.FC<FeatureMenuProps> = ({
    onFeatureSelect,
    selectedFeature,
    onSearchSatellites,
    onShowUserCreated,
    onTestConstellations
}) => {
    const [activeTab, setActiveTab] = useState<MenuTab>('basic');
    const [isExpanded, setIsExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

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
    };

    const handleFeatureClick = (featureId: string) => {
        if (featureId === 'test-constellations') {
            handleTestConstellations();
        } else {
            onFeatureSelect(featureId);
        }
    };

    const handleTabClick = (tab: MenuTab) => {
        setActiveTab(tab);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (onSearchSatellites) {
            onSearchSatellites(query);
        }
    };

    const handleShowUserCreated = () => {
        if (onShowUserCreated) {
            onShowUserCreated();
        }
    };

    const handleTestConstellations = () => {
        if (onTestConstellations) {
            onTestConstellations();
        }
    };

    return (
        <div className={`feature-menu ${isExpanded ? 'expanded' : 'collapsed'}`}>
            {/* Menu Toggle Button */}
            <div className="menu-toggle" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="menu-icon">
                    <div className="hamburger-line"></div>
                    <div className="hamburger-line"></div>
                    <div className="hamburger-line"></div>
                </div>
                <span className="menu-title">Features</span>
            </div>

            {/* Menu Content */}
            {isExpanded && (
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
            )}
        </div>
    );
};
