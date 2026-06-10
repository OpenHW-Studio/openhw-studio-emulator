import React from 'react';

// Bounding box for the power supply (matches manifest w: 60, h: 60)
export const BOUNDS = { x: 0, y: 0, w: 60, h: 60 };

export const PowerSupplyUI = ({ state, attrs }: { state: any, attrs: any }) => {
    // Format voltage to 1 decimal place to simulate a digital display
    const rawVoltage = attrs?.voltage || '5.0';
    const parsedV = parseFloat(rawVoltage);
    const voltageStr = !isNaN(parsedV) ? parsedV.toFixed(1) + 'V' : rawVoltage + 'V';

    return (
        <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h, pointerEvents: 'none' }}>
            <svg width="60" height="60" viewBox="0 0 60 60">
                <defs>
                    <linearGradient id="psuBody" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#424242" />
                        <stop offset="100%" stopColor="#212121" />
                    </linearGradient>
                    <linearGradient id="psuScreen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#111" />
                        <stop offset="100%" stopColor="#000" />
                    </linearGradient>
                </defs>
                
                {/* Main Metallic Case (Width 55 to leave room for terminal pins) */}
                <rect x="0" y="0" width="55" height="60" rx="4" fill="url(#psuBody)" stroke="#616161" strokeWidth="1" />
                
                {/* Top Grille Details */}
                <line x1="5" y1="5" x2="50" y2="5" stroke="#111" strokeWidth="1" />
                <line x1="5" y1="8" x2="50" y2="8" stroke="#111" strokeWidth="1" />
                <line x1="5" y1="11" x2="50" y2="11" stroke="#111" strokeWidth="1" />

                {/* Digital Screen Recess */}
                <rect x="5" y="16" width="45" height="20" rx="2" fill="url(#psuScreen)" stroke="#333" strokeWidth="1" />
                
                {/* Glowing Green Voltage Text */}
                <text 
                    x="27.5" y="31" 
                    fill="#00FF00" 
                    fontSize="12" 
                    fontFamily="monospace" 
                    fontWeight="bold" 
                    textAnchor="middle" 
                    style={{ textShadow: '0px 0px 4px #00FF00' }}
                >
                    {voltageStr}
                </text>

                {/* Status LED */}
                <circle cx="10" cy="48" r="2" fill="#00FF00" style={{ filter: 'drop-shadow(0px 0px 2px #00FF00)' }} />
                <text x="14" y="51" fill="#BDBDBD" fontSize="6" fontFamily="sans-serif">ON</text>

                {/* Terminals extending to x=60 */}
                {/* Red Terminal (Power) at y=16.5 */}
                <rect x="55" y="14" width="3" height="5" fill="#B71C1C" />
                <path d="M 55 16.5 L 60 16.5" stroke="#E53935" strokeWidth="3" strokeLinecap="round" />
                
                {/* Black Terminal (Ground) at y=46.5 */}
                <rect x="55" y="44" width="3" height="5" fill="#212121" />
                <path d="M 55 46.5 L 60 46.5" stroke="#424242" strokeWidth="3" strokeLinecap="round" />
            </svg>
        </div>
    );
};
