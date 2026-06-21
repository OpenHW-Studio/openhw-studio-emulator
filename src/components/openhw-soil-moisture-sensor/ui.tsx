import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 270, h: 90 };

export const SoilMoistureSensorUI = ({ state, attrs, isRunning }: { state: any, attrs: any, isRunning: boolean }) => {
    const moisture = state?.moisture ?? 50;
    
    // The probe extends from x=85 to x=260 (175px long)
    const probeLength = 175;
    const moistureWidth = (Math.max(0, Math.min(100, moisture)) / 100) * probeLength;

    return (
        <div style={{
            width: BOUNDS.w,
            height: BOUNDS.h,
            position: 'relative'
        }}>
            <svg
                width="100%"
                height="100%"
                viewBox="0 0 270 90"
                style={{ display: 'block', pointerEvents: 'none' }}
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id="metalPin" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#9CA3AF" />
                        <stop offset="50%" stopColor="#F3F4F6" />
                        <stop offset="100%" stopColor="#6B7280" />
                    </linearGradient>
                    <clipPath id="probeClip">
                        <path 
                            d="M 25 15 L 55 15 L 70 25 L 260 25 A 5 5 0 0 1 265 30 L 265 60 A 5 5 0 0 1 260 65 L 70 65 L 55 75 L 25 75 Z" 
                        />
                    </clipPath>
                    <linearGradient id="waterGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="rgba(52, 152, 219, 0.4)" />
                        <stop offset="100%" stopColor="rgba(41, 128, 185, 0.7)" />
                    </linearGradient>
                </defs>

                {/* Header Pins extending to x=0 anchor points */}
                <rect x="0" y="28.5" width="25" height="3" fill="url(#metalPin)" rx="1" />
                <rect x="0" y="43.5" width="25" height="3" fill="url(#metalPin)" rx="1" />
                <rect x="0" y="58.5" width="25" height="3" fill="url(#metalPin)" rx="1" />
                
                {/* Connection points exactly at x=0 */}
                <circle cx="0" cy="30" r="1.5" fill="#333" />
                <circle cx="0" cy="45" r="1.5" fill="#333" />
                <circle cx="0" cy="60" r="1.5" fill="#333" />

                {/* Black plastic header block */}
                <rect x="15" y="23" width="8" height="44" fill="#1A202C" rx="1.5" />
                {/* Header Plastic Ridges */}
                <rect x="17" y="29.5" width="4" height="1" fill="#2D3748" />
                <rect x="17" y="44.5" width="4" height="1" fill="#2D3748" />
                <rect x="17" y="59.5" width="4" height="1" fill="#2D3748" />

                {/* Main PCB shape (Matte Black) */}
                <path 
                    d="M 25 15 L 55 15 L 70 25 L 260 25 A 5 5 0 0 1 265 30 L 265 60 A 5 5 0 0 1 260 65 L 70 65 L 55 75 L 25 75 Z" 
                    fill="#1A1A1A" 
                    stroke="#2D3748" 
                    strokeWidth="1"
                />

                {/* Capacitive Traces (Lighter grey mimicking copper under black solder mask) */}
                <path d="M 80 29 L 255 29 A 1 1 0 0 1 256 30 L 256 60 A 1 1 0 0 1 255 61 L 80 61" fill="none" stroke="#2D3748" strokeWidth="2" />
                <path d="M 80 34 L 250 34 A 1 1 0 0 1 251 35 L 251 55 A 1 1 0 0 1 250 56 L 80 56" fill="none" stroke="#2D3748" strokeWidth="2" />
                <path d="M 80 39 L 245 39 A 1 1 0 0 1 246 40 L 246 50 A 1 1 0 0 1 245 51 L 80 51" fill="none" stroke="#2D3748" strokeWidth="2" />

                {/* Soil Immersion Limit Line */}
                <line x1="85" y1="25" x2="85" y2="65" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="2,2" opacity="0.6" />
                <text x="82" y="45" fill="#FFFFFF" fontSize="5" transform="rotate(-90, 82, 45)" textAnchor="middle" opacity="0.6" fontWeight="bold">MAX</text>

                {/* SMT Components */}
                {/* 555 Timer IC (SOIC-8) */}
                <rect x="44" y="40" width="8" height="10" fill="#111" rx="0.5" />
                {/* IC Pins */}
                <rect x="42" y="41" width="2" height="1" fill="#bbb" />
                <rect x="42" y="43" width="2" height="1" fill="#bbb" />
                <rect x="42" y="45" width="2" height="1" fill="#bbb" />
                <rect x="42" y="47" width="2" height="1" fill="#bbb" />
                <rect x="52" y="41" width="2" height="1" fill="#bbb" />
                <rect x="52" y="43" width="2" height="1" fill="#bbb" />
                <rect x="52" y="45" width="2" height="1" fill="#bbb" />
                <rect x="52" y="47" width="2" height="1" fill="#bbb" />
                <circle cx="45.5" cy="41.5" r="0.5" fill="#333" />

                {/* Voltage Regulator (SOT-23) */}
                <rect x="46" y="24" width="4" height="6" fill="#111" rx="0.5" />
                <rect x="45" y="24.5" width="1" height="1.5" fill="#bbb" />
                <rect x="45" y="28" width="1" height="1.5" fill="#bbb" />
                <rect x="50" y="26.25" width="1" height="1.5" fill="#bbb" />

                {/* Passives (Caps and Resistors) */}
                <rect x="35" y="30" width="2.5" height="1.5" fill="#D2A679" />
                <rect x="35" y="34" width="2.5" height="1.5" fill="#111" />
                <rect x="58" y="32" width="1.5" height="2.5" fill="#111" />
                <rect x="58" y="38" width="1.5" height="2.5" fill="#D2A679" />

                {/* Silkscreen Text */}
                <text x="48" y="56" fill="#FFFFFF" fontSize="3" fontWeight="bold" textAnchor="middle" opacity="0.8">v1.2</text>
                <text x="35" y="20" fill="#FFFFFF" fontSize="3.5" fontWeight="bold" opacity="0.8">Capacitive</text>
                <text x="35" y="24" fill="#FFFFFF" fontSize="3.5" fontWeight="bold" opacity="0.8">Soil Moisture</text>
                
                {/* Pin Labels */}
                <text x="26" y="31.5" fill="#FFFFFF" fontSize="4" fontWeight="bold">GND</text>
                <text x="26" y="46.5" fill="#FFFFFF" fontSize="4" fontWeight="bold">VCC</text>
                <text x="26" y="61.5" fill="#FFFFFF" fontSize="4" fontWeight="bold">AOUT</text>

                {/* Dynamic Water/Soil Immersion Visualization */}
                {moisture > 0 && (
                    <g clipPath="url(#probeClip)">
                        <rect 
                            x={265 - moistureWidth} 
                            y="25" 
                            width={moistureWidth + 10} 
                            height="40" 
                            fill="url(#waterGrad)" 
                            style={{ transition: 'x 0.2s ease-in-out, width 0.2s ease-in-out' }}
                        />
                        {/* Edge line of the water */}
                        <line 
                            x1={265 - moistureWidth} y1="25" 
                            x2={265 - moistureWidth} y2="65" 
                            stroke="#5DADE2" strokeWidth="1" opacity="0.8" 
                            style={{ transition: 'x 0.2s ease-in-out' }}
                        />
                    </g>
                )}
            </svg>

            {/* Interactive Moisture Slider Panel */}
            {isRunning && (
                <div style={{
                    position: 'absolute',
                    top: '8px',
                    left: '85px', // Start right after the word "MAX" line
                    background: 'rgba(26, 32, 44, 0.85)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid #4A5568',
                    pointerEvents: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(2px)'
                }}>
                    <span style={{ color: '#E2E8F0', fontSize: '11px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                        {Math.round(moisture).toString().padStart(3, ' ')}%
                    </span>
                    <input 
                        type="range" 
                        min="0" max="100" 
                        value={moisture} 
                        onChange={(e) => {
                            if (attrs?.onInteract) {
                                attrs.onInteract({ type: 'SET_MOISTURE', value: parseFloat(e.target.value) });
                            }
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        style={{ width: '80px', cursor: 'pointer', margin: 0 }} 
                    />
                </div>
            )}
        </div>
    );
};
