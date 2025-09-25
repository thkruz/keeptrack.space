import React, { useEffect, useRef, useState } from 'react';
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
    const [isAnimating, setIsAnimating] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isExpanded) return;

            switch (e.key) {
                case 'Escape':
                    setIsExpanded(false);
                    break;
                case 'Tab':
                    // Allow default tab behavior
                    break;
                case 'Enter':
                case ' ':
                    if (document.activeElement?.classList.contains('feature-item')) {
                        e.preventDefault();
                        (document.activeElement as HTMLElement).click();
                    }
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isExpanded]);

    // Focus search input when menu expands
    useEffect(() => {
        if (isExpanded && searchInputRef.current) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 300); // Wait for animation to complete
        }
    }, [isExpanded]);

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
        <div
            ref={menuRef}
            className={`feature-menu ${isExpanded ? 'expanded' : 'collapsed'} ${isAnimating ? 'animating' : ''}`}>
            {/* Menu Toggle Button */}
            <div
                className="menu-toggle"
                onClick={() => {
                    if (isAnimating) return;
                    setIsAnimating(true);
                    setIsExpanded(!isExpanded);
                    setTimeout(() => setIsAnimating(false), 300);
                }}
                role="button"
                tabIndex={0}
                aria-label={isExpanded ? 'Close menu' : 'Open menu'}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (!isAnimating) {
                            setIsAnimating(true);
                            setIsExpanded(!isExpanded);
                            setTimeout(() => setIsAnimating(false), 300);
                        }
                    }
                }}
            >
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
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleTabClick('basic');
                                }
                            }}
                        >
                            Basic
                        </button>
                        <button
                            className={`tab ${activeTab === 'advanced' ? 'active' : ''}`}
                            onClick={() => handleTabClick('advanced')}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleTabClick('advanced');
                                }
                            }}
                        >
                            Advanced
                        </button>
                        <button
                            className={`tab ${activeTab === 'analysis' ? 'active' : ''}`}
                            onClick={() => handleTabClick('analysis')}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleTabClick('analysis');
                                }
                            }}
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
                                        if (onSearchSatellites) {
                                            onSearchSatellites(searchQuery);
                                        }
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
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleFeatureClick(item.id);
                                    }
                                }}
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
