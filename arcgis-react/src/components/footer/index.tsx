import React, { useEffect, useState } from 'react';

interface FooterProps {
    isVisible: boolean;
    title: string | null;
    onClose: () => void;
    children: React.ReactNode;
}

export const Footer: React.FC<FooterProps> = ({ isVisible, title, onClose, children }) => {
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setExpanded(true);
        } else {
            setExpanded(false);
        }
    }, [isVisible]);

    if (!isVisible) return null;

    const height = expanded ? '66vh' : '50px';

    return (
        <div
            style={{
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: 0,
                height,
                background: 'rgba(15, 15, 15, 0.95)',
                borderTop: '1px solid rgba(255, 255, 255, 0.15)',
                zIndex: 1100,
                display: 'flex',
                flexDirection: 'column',
                backdropFilter: 'blur(10px)'
            }}
        >
            <div
                style={{
                    height: 50,
                    minHeight: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 12px',
                    borderBottom: expanded ? '1px solid rgba(255, 255, 255, 0.08)' : 'none'
                }}
            >
                <div style={{ color: '#E0E0E0', fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {title || ''}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                        onClick={() => setExpanded((v) => !v)}
                        title={expanded ? 'Minimize' : 'Expand'}
                        style={{
                            height: 32,
                            width: 32,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'transparent',
                            color: '#B0BEC5',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: 8,
                            cursor: 'pointer'
                        }}
                        aria-label={expanded ? 'Minimize' : 'Expand'}
                    >
                        {expanded ? '▼' : '▲'}
                    </button>
                    <button
                        onClick={onClose}
                        title="Close"
                        style={{
                            height: 32,
                            width: 32,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'transparent',
                            color: '#B0BEC5',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: 8,
                            cursor: 'pointer'
                        }}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>
            </div>

            {expanded && (
                <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 12 }}>
                    {children}
                </div>
            )}
        </div>
    );
};


