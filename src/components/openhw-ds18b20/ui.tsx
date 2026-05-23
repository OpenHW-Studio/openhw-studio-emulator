import React from 'react';

// Defines the physical bounds for the simulator engine
export const BOUNDS = { x: 0, y: 0, w: 50, h: 100 };

// Context menu for part attributes (simulating temperature)
export const DS18B20ContextMenu = ({ attrs, onUpdate }: { attrs: any; onUpdate: (key: string, value: any) => void }) => (
    <>
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>Simulated Temp (°C):</span>
        <input
            type="number"
            value={attrs?.temperature ?? '25'}
            step="1"
            onChange={e => onUpdate('temperature', e.target.value)}
            style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: 2, outline: 'none' }}
        />
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>Resolution (bits):</span>
        <select
            value={attrs?.resolution ?? '12'}
            onChange={e => onUpdate('resolution', e.target.value)}
            style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: 2, outline: 'none' }}
        >
            <option value="9">9-bit</option>
            <option value="10">10-bit</option>
            <option value="11">11-bit</option>
            <option value="12">12-bit (default)</option>
        </select>
    </>
);

export const DS18B20UI = ({ state, attrs, onEvent }: { state: any; attrs: any; onEvent?: (event: any) => void }) => {
    // BUG FIX: Ensure the value is cast to a Number so .toFixed() doesn't crash the app
    const temperature = Number(state?.temperature ?? attrs?.temperature ?? 25.0);

    return (
        <div style={{ position: 'relative', width: 50, height: 100 }}>
            <svg
                viewBox="0 0 50 100"
                width="100%"
                height="100%"
                style={{ cursor: 'pointer', display: 'block' }}
                onClick={() => onEvent?.({ type: 'PART_CLICK' })}
            >
                {/* Dark Blue PCB Background */}
                <rect x="1" y="1" width="48" height="98" rx="3" ry="3" fill="#0c4c92" stroke="#08386c" strokeWidth="0.5" />

                {/* --- Top Text Box & Vias --- */}
                <rect x="3" y="3" width="44" height="14" fill="none" stroke="white" strokeWidth="0.8" />
                <text x="10" y="12" fontFamily="sans-serif" fontSize="6.5" fontWeight="bold" fill="white" textAnchor="middle">GND</text>
                <text x="25" y="12" fontFamily="sans-serif" fontSize="6.5" fontWeight="bold" fill="white" textAnchor="middle">DQ</text>
                <text x="40" y="12" fontFamily="sans-serif" fontSize="6.5" fontWeight="bold" fill="white" textAnchor="middle">VCC</text>
                
                {/* Top vias */}
                <circle cx="10" cy="22" r="2" fill="#111" stroke="#ccc" strokeWidth="1"/>
                <circle cx="25" cy="22" r="2" fill="#111" stroke="#ccc" strokeWidth="1"/>
                <circle cx="40" cy="22" r="2" fill="#111" stroke="#ccc" strokeWidth="1"/>

                {/* --- Trace Routing --- */}
                <path d="M 10 24 L 10 55 Q 25 55, 25 45 M 25 24 L 25 35 Q 25 40, 25 45 M 40 24 L 40 55 Q 25 55, 25 45" fill="none" stroke="#60a5fa" strokeWidth="0.5" opacity="0.3" />

                {/* --- Components --- */}
                {/* DS18B20 Sensor package (TO-92) */}
                <path d="M 25 40 L 25 50 M 23 40 L 23 50 M 27 40 L 27 50" stroke="#bbb" strokeWidth="1"/>
                <rect x="19" y="32" width="12" height="10" fill="#1f1f1f" stroke="#111" strokeWidth="0.5" />
                <text x="25" y="38" fontFamily="sans-serif" fontSize="3" fill="#a0a0a0" textAnchor="middle">DS18B20</text>
                <circle cx="20" cy="33" r="0.5" fill="#303030"/>

                {/* SMD Passives with specific values */}
                {/* R1 (103) */}
                <text x="5" y="60" fontFamily="sans-serif" fontSize="5" fill="white" transform="rotate(-90 5 60)">R1</text>
                <rect x="7" y="60" width="10" height="20" fill="none" stroke="white" strokeWidth="0.8" rx="1"/>
                <rect x="8" y="61" width="8" height="18" fill="#1a1a1a"/>
                <text x="12" y="72" fontFamily="monospace" fontSize="4.5" fill="white" textAnchor="middle" transform="rotate(-90 12 70)">103</text>

                {/* R2 (102) */}
                <text x="20" y="60" fontFamily="sans-serif" fontSize="5" fill="white" transform="rotate(-90 20 60)">R2</text>
                <rect x="22" y="60" width="10" height="20" fill="none" stroke="white" strokeWidth="0.8" rx="1"/>
                <rect x="23" y="61" width="8" height="18" fill="#1a1a1a"/>
                <text x="27" y="72" fontFamily="monospace" fontSize="4.5" fill="white" textAnchor="middle" transform="rotate(-90 27 70)">102</text>

                {/* D1 (LED) */}
                <text x="35" y="60" fontFamily="sans-serif" fontSize="5" fill="white" transform="rotate(-90 35 60)">D1</text>
                <rect x="37" y="60" width="10" height="20" fill="none" stroke="white" strokeWidth="0.8" rx="1"/>
                <rect x="38" y="61" width="8" height="18" fill="#cbd5e1"/>
                <rect x="38" y="69" width="8" height="2" fill="#4ade80" />

                {/* U1 Label */}
                <text x="5" y="45" fontFamily="sans-serif" fontSize="6.5" fill="white" transform="rotate(-90 5 45)">U1</text>

                {/* --- Bottom Pins & Header --- */}
                {/* Header Plastic Block */}
                <rect x="5" y="85" width="40" height="5" rx="1.5" ry="1.5" fill="#1a1a1a" />
                
                {/* Connection Pads/vias on header */}
                <circle cx="10" cy="87.5" r="1.5" fill="#bbb" />
                <circle cx="25" cy="87.5" r="1.5" fill="#bbb" />
                <circle cx="40" cy="87.5" r="1.5" fill="#bbb" />
            </svg>
        </div>
    );
};
