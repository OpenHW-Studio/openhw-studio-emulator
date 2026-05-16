import React from 'react';

// Context Menu for live tuning
export const LdrContextMenu = ({ attrs, onUpdate }: { attrs: any, onUpdate: (key: string, value: any) => void }) => {
    const lux = attrs?.lux ?? 500;
    const threshold = attrs?.threshold ?? 500;

    // Update manifest attributes AND send data to the running Web Worker
    const handleSlider = (key: string, value: number) => {
        onUpdate(key, value);
        if (attrs && attrs.onInteract) {
            attrs.onInteract({ type: 'SET_ATTR', key, value });
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px' }} data-contextmenu="true">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '10px', color: 'var(--text2)', marginBottom: '2px' }}>Lux: {lux}</label>
                <input 
                    type="range" min="0" max="1000" value={lux}
                    onChange={(e) => handleSlider('lux', parseFloat(e.target.value))}
                    onPointerDown={(e) => e.stopPropagation()}
                    style={{ width: '80px', cursor: 'pointer' }}
                />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '10px', color: 'var(--text2)', marginBottom: '2px' }}>Threshold: {threshold}</label>
                <input 
                    type="range" min="0" max="1000" value={threshold}
                    onChange={(e) => handleSlider('threshold', parseFloat(e.target.value))}
                    onPointerDown={(e) => e.stopPropagation()}
                    style={{ width: '80px', cursor: 'pointer' }}
                />
            </div>
        </div>
    );
};

// BOUNDS: covers the full visual area (PCB body + LDR head). Pin stubs are excluded.
export const BOUNDS = { x: 0, y: 0, w: 187.5, h: 75 };

export const LdrModuleUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const pwrLed = state?.pwrLed || false;
    const doLed = state?.doLed || false;

    return (
        <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0 }}>
            <svg width="100%" height="100%" viewBox="0 0 187.5 75">
                {/* Main PCB */}
                <rect x="28" y="0" width="131" height="75" fill="#1b223c" />
                <circle cx="37.5" cy="9.375" r="3.75" fill="#d1d8e0" />
                <circle cx="37.5" cy="65.625" r="3.75" fill="#d1d8e0" />

                {/* LDR Head */}
                <rect x="0" y="18.75" width="15" height="37.5" fill="#c0392b" rx="3.75" />
                <line x1="15" y1="28" x2="28" y2="28" stroke="#bdc3c7" strokeWidth="3.75" />
                <line x1="15" y1="47" x2="28" y2="47" stroke="#bdc3c7" strokeWidth="3.75" />

                {/* Potentiometer & IC */}
                <rect x="71" y="3.75" width="37.5" height="37.5" fill="#2980b9" />
                <circle cx="90" cy="22.5" r="11.25" fill="#ecf0f1" />
                <rect x="71" y="47" width="30" height="22.5" fill="#2c3e50" />

                {/* Status LEDs */}
                <rect x="118" y="18.75" width="11.25" height="7.5" fill={pwrLed ? "#e74c3c" : "#551111"} />
                <rect x="118" y="47" width="11.25" height="7.5" fill={doLed ? "#2ecc71" : "#114422"} />

                {/* Pin labels */}
                <text x="133" y="15" fontSize="9.375" fill="white" dominantBaseline="middle">VCC</text>
                <text x="133" y="30" fontSize="9.375" fill="white" dominantBaseline="middle">GND</text>
                <text x="133" y="45" fontSize="9.375" fill="white" dominantBaseline="middle">DO</text>
                <text x="133" y="60" fontSize="9.375" fill="white" dominantBaseline="middle">AO</text>

                {/* Pin stub wires (15px pitch) */}
                {[15, 30, 45, 60].map(y => (
                    <line key={y} x1="159" y1={y} x2="187.5" y2={y} stroke="silver" strokeWidth="3.75" />
                ))}
            </svg>
        </div>
    );
};
