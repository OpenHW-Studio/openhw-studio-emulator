import React from 'react';

// BOUNDS: covers the full visual area.
export const BOUNDS = { x: 0, y: 0, w: 187.5, h: 75 };

export const LdrModuleUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const pwrLed = state?.pwrLed || false;
    const doLed = state?.doLed || false;

    return (
        <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0 }}>
            <svg width="100%" height="100%" viewBox="0 0 187.5 75" xmlns="http://www.w3.org/2000/svg">
                {/* 1. Main PCB Body - Deep Navy */}
                <rect x="28" y="0" width="131" height="75" fill="#1e2749" rx="2" />
                
                {/* Mounting Holes */}
                <circle cx="37.5" cy="12" r="5" fill="none" stroke="#666" strokeWidth="2" />
                <circle cx="37.5" cy="63" r="5" fill="none" stroke="#666" strokeWidth="2" />

                {/* 2. LDR Sensor (The red head) */}
                <rect x="0" y="24" width="12" height="27" fill="#d32f2f" rx="2" />
                {/* Red connector base */}
                <rect x="12" y="22" width="16" height="31" fill="#c62828" />
                {/* Silver leads */}
                <line x1="28" y1="32" x2="38" y2="32" stroke="#bdc3c7" strokeWidth="3" />
                <line x1="28" y1="43" x2="38" y2="43" stroke="#bdc3c7" strokeWidth="3" />

                {/* 3. SMD Components (Resistors/Capacitors) */}
                <g fill="#4a5568">
                    <rect x="52" y="10" width="15" height="8" rx="1" fill="#718096" /> {/* Capacitor */}
                    <rect x="52" y="25" width="15" height="8" rx="1" fill="#a0aec0" />
                    <rect x="52" y="40" width="15" height="8" rx="1" fill="#2d3748" />
                    <rect x="52" y="55" width="15" height="8" rx="1" fill="#718096" />
                </g>

                {/* 4. The Blue Potentiometer (Tuning Dial) */}
                <rect x="78" y="6" width="38" height="38" fill="#4a90e2" rx="1" />
                <circle cx="97" cy="25" r="12" fill="#357abd" />
                {/* Crosshair on dial */}
                <line x1="97" y1="18" x2="97" y2="32" stroke="#1e2749" strokeWidth="2" />
                <line x1="90" y1="25" x2="104" y2="25" stroke="#1e2749" strokeWidth="2" />

                {/* 5. Integrated Circuit (Comparator) */}
                <rect x="78" y="48" width="32" height="22" fill="#1a202c" rx="1" />
                {/* IC Pins */}
                {[50, 56, 62, 68].map(y => (
                    <rect key={y} x="74" y={y} width="4" height="2" fill="#cbd5e0" />
                ))}

                {/* 6. Status LEDs and Labels */}
                {/* Power LED */}
                <text x="125" y="15" fontSize="7" fill="white" fontWeight="bold">PWR</text>
                <text x="125" y="23" fontSize="7" fill="white" fontWeight="bold">LED</text>
                <rect x="145" y="14" width="12" height="8" fill={pwrLed ? "#ff5252" : "#3d1a1a"} rx="1" />

                {/* Main Indicator LED */}
                <circle cx="132" cy="45" r="10" fill="#cbd5e0" />
                <text x="125" y="65" fontSize="7" fill="white" fontWeight="bold">DO</text>
                <text x="125" y="73" fontSize="7" fill="white" fontWeight="bold">LED</text>
                <rect x="145" y="64" width="12" height="8" fill={doLed ? "#69db7c" : "#1a3d21"} rx="1" />

                {/* 7. Pin Headers & Labels */}
                <g transform="translate(155, 10)">
                    <rect x="0" y="0" width="10" height="55" fill="none" stroke="#666" strokeWidth="1" />
                    {[5, 20, 35, 50].map((y, i) => {
                        const labels = ["VCC", "GND", "DO", "AO"];
                        return (
                            <g key={y}>
                                <text x="-2" y={y + 1} fontSize="8" fill="white" textAnchor="end" dominantBaseline="middle">
                                    {labels[i]}
                                </text>
                                {/* Silver Pin Stubs */}
                                <rect x="0" y={y - 2} width="35" height="4" fill="#a0aec0" />
                            </g>
                        );
                    })}
                </g>
            </svg>
        </div>
    );
};

export const LdrContextMenu = ({ component, onClose }: { component: any; onClose: () => void }) => {
    const [luxValue, setLuxValue] = React.useState(component?.state?.lux || 500);

    const handleLuxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value) || 0;
        setLuxValue(value);
        if (component?.logic?.setLux) {
            component.logic.setLux(value);
        }
    };

    return (
        <div
            style={{
                backgroundColor: '#2d2d30',
                border: '1px solid #3e3e42',
                borderRadius: '4px',
                padding: '12px',
                minWidth: '200px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                fontFamily: 'var(--vscode-font-family)',
                fontSize: '12px',
                color: '#cccccc'
            }}
        >
            <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                    Light Intensity (Lux)
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                        type="range"
                        min="0"
                        max="10000"
                        value={luxValue}
                        onChange={handleLuxChange}
                        style={{ flex: 1, cursor: 'pointer' }}
                    />
                    <input
                        type="number"
                        min="0"
                        max="10000"
                        value={luxValue}
                        onChange={handleLuxChange}
                        style={{
                            width: '60px',
                            padding: '4px',
                            backgroundColor: '#3e3e42',
                            color: '#cccccc',
                            border: '1px solid #555555',
                            borderRadius: '2px'
                        }}
                    />
                </div>
            </div>

            <div style={{ fontSize: '11px', color: '#858585', marginTop: '8px' }}>
                <div>• 0-10 lux: Darkness</div>
                <div>• 10-50 lux: Very dark</div>
                <div>• 50-500 lux: Indoor lighting</div>
                <div>• 500-5000 lux: Bright daylight</div>
                <div>• 5000+ lux: Direct sunlight</div>
            </div>
        </div>
    );
};