import React from 'react';

// Context Menu for live tuning
export const PhotodiodeContextMenu = ({ attrs, onUpdate }: { attrs: any, onUpdate: (key: string, value: any) => void }) => {
    const light = attrs?.light ?? 0;

    const handleSlider = (key: string, value: number) => {
        onUpdate(key, value);
        if (attrs && attrs.onInteract) {
            attrs.onInteract({ type: 'SET_ATTR', key, value });
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px' }} data-contextmenu="true">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '10px', color: 'var(--text2)', marginBottom: '2px' }}>Light Level: {light}</label>
                <input 
                    type="range" min="0" max="100" value={light}
                    onChange={(e) => handleSlider('light', parseFloat(e.target.value))}
                    onPointerDown={(e) => e.stopPropagation()}
                    style={{ width: '80px', cursor: 'pointer' }}
                />
            </div>
        </div>
    );
};

export const BOUNDS = { x: 0, y: 0, w: 15, h: 40 };

export const PhotodiodeUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const light = state?.light ?? 0;

    return (
        <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0 }}>
            <svg width="100%" height="100%" viewBox="-3 -5 21 55" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
                <g transform="translate(7.5, 10)">
                    <path d="M -5 5 L -5 -2 A 5 5 0 0 1 5 -2 L 5 5 Z" fill="#2c3e50" opacity="0.8" />
                    <rect x="-6" y="5" width="12" height="2" fill="#2c3e50" />

                    {/* Simulated light collection area */}
                    {light > 0 && (
                        <circle cx="0" cy="0" r={2.5 + (light / 20)} fill="#f1c40f" opacity={light / 200} />
                    )}
                    <circle cx="0" cy="0" r="2.5" fill={light > 10 ? "#f1c40f" : "#7f8c8d"} />
                </g>

                {/* Pins with 15px spacing to match breadboard */}
                <line x1="2.5" y1="17" x2="0" y2="40" stroke="#95a5a6" strokeWidth="1" />
                <line x1="12.5" y1="17" x2="20" y2="40" stroke="#95a5a6" strokeWidth="1" />

                <circle cx="0" cy="40" r="1.5" fill="#ecf0f1" />
                <circle cx="20" cy="40" r="1.5" fill="#ecf0f1" />

                {/* Flat spot indicating cathode commonly */}
                <rect x="11" y="15" width="2" height="2" fill="#e74c3c" />

                <text x="0" y="46" fontSize="4" fill="#f8fafc" textAnchor="middle">A</text>
                <text x="15" y="46" fontSize="4" fill="#f8fafc" textAnchor="middle">C</text>
            </svg>
        </div>
    );
};
