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

export const BOUNDS = { x: 0, y: 0, w: 15, h: 45 };

export const PhotodiodeUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const light = state?.light ?? 0;

    return (
        <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0 }}>
            <svg width="100%" height="100%" viewBox="0 0 15 45" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
                <defs>
                    <linearGradient id="legMetal" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#9CA3AF" />
                        <stop offset="50%" stopColor="#F3F4F6" />
                        <stop offset="100%" stopColor="#6B7280" />
                    </linearGradient>

                    <linearGradient id="pdBody" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="rgba(20, 20, 20, 0.85)" />
                        <stop offset="30%" stopColor="rgba(60, 60, 60, 0.9)" />
                        <stop offset="70%" stopColor="rgba(20, 20, 20, 0.85)" />
                        <stop offset="100%" stopColor="rgba(5, 5, 5, 0.9)" />
                    </linearGradient>
                    
                    <linearGradient id="highlight" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                        <stop offset="20%" stopColor="rgba(255,255,255,0.4)" />
                        <stop offset="35%" stopColor="rgba(255,255,255,0)" />
                    </linearGradient>

                    <filter id="glow">
                        <feGaussianBlur stdDeviation="1" />
                    </filter>
                </defs>

                {/* Anode Leg (Left) */}
                <path d="M 5.5 13 L 5.5 25 Q 5.5 35 0 45" fill="none" stroke="url(#legMetal)" strokeWidth="1.2" strokeLinecap="round" />
                {/* Cathode Leg (Right) */}
                <path d="M 9.5 13 L 9.5 25 Q 9.5 35 15 45" fill="none" stroke="url(#legMetal)" strokeWidth="1.2" strokeLinecap="round" />

                {/* Internal Lead Frame */}
                {/* Anode Post */}
                <rect x="5" y="8" width="1" height="6" fill="url(#legMetal)" />
                <polygon points="5,8 6,8 5.5,5" fill="url(#legMetal)" />
                {/* Cathode Anvil */}
                <rect x="8.5" y="6" width="2" height="8" fill="url(#legMetal)" />
                <polygon points="8.5,6 10.5,6 10,4 7.5,4 7.5,5 8.5,6" fill="url(#legMetal)" />
                
                {/* Silicon Die */}
                <rect x="8" y="3.5" width="1.5" height="1.5" fill="#000" />
                
                {/* Golden Wire bond */}
                <path d="M 5.5 5 Q 6.5 2.5 8.5 4" fill="none" stroke="#F5B041" strokeWidth="0.25" />

                {/* Main plastic body (Dark tinted) */}
                <path d="M 3 5 C 3 -1.5, 12 -1.5, 12 5 L 12 13 L 3 13 Z" fill="url(#pdBody)" />
                <path d="M 3 5 C 3 -1.5, 12 -1.5, 12 5 L 12 13 L 3 13 Z" fill="url(#highlight)" />
                
                {/* Base Flange */}
                <rect x="2.5" y="13" width="10" height="2" rx="0.5" fill="url(#pdBody)" />
                <rect x="2.5" y="13" width="10" height="2" rx="0.5" fill="url(#highlight)" />
                
                {/* Flat spot indicating cathode */}
                <rect x="12" y="13" width="0.5" height="2" fill="rgba(10,10,10,0.9)" />

                {/* Dynamic light glow on the silicon die */}
                {light > 0 && (
                    <circle 
                        cx="8.75" cy="4.25" 
                        r={1 + (light / 30)} 
                        fill="#F1C40F" 
                        opacity={0.3 + (light / 150)} 
                        filter="url(#glow)" 
                    />
                )}

                {/* Connection points exactly at y=45 */}
                <circle cx="0" cy="45" r="1.5" fill="#333" />
                <circle cx="15" cy="45" r="1.5" fill="#333" />

                {/* Labels floating slightly below */}
                <text x="0" y="52" fontSize="4" fill="#555" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">A</text>
                <text x="15" y="52" fontSize="4" fill="#555" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">C</text>
            </svg>
        </div>
    );
};
