import React from 'react';

// Expanded bounds for longer pins to keep hover boxes away from text
export const BOUNDS = { x: 0, y: 0, w: 120, h: 120 };

export const DS1307RTCContextMenu = ({
    attrs,
    onUpdate,
}: {
    attrs: any;
    onUpdate: (key: string, value: any) => void;
}) => (
    <>
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>Date &amp; Time:</span>
        <input
            type="datetime-local"
            value={(attrs?.datetime ?? '2024-01-01T00:00:00').slice(0, 16)}
            onChange={e => onUpdate('datetime', e.target.value + ':00')}
            style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 4px', outline: 'none', fontSize: 11 }}
        />
    </>
);

export const DS1307RTCUI = ({
    state,
    attrs,
    onEvent,
}: {
    state: any;
    attrs: any;
    onEvent?: (event: any) => void;
}) => {
    const powered = state?.powered ?? false;
    const display = state?.display ?? '2024-01-01 00:00:00';
    const [datePart, timePart] = display.split(' ');

    return (
        <div style={{ position: 'relative', width: 120, height: 120 }}>
            <svg width="120" height="120" viewBox="0 0 120 120" style={{ fontFamily: 'sans-serif' }}>
                {/* PCB Base - Centered, 15px margins */}
                <rect x="15" y="0" width="90" height="120" rx="3" fill="#184a8c" />
                <rect x="15" y="0" width="90" height="120" rx="3" fill="none" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="0.75" />

                {/* Mounting Holes */}
                <circle cx="21" cy="7.5" r="2.6" fill="#0f172a" stroke="#d1d5db" strokeWidth="0.75"/>
                <circle cx="99" cy="112.5" r="2.6" fill="#0f172a" stroke="#d1d5db" strokeWidth="0.75"/>
                <circle cx="21" cy="112.5" r="2.6" fill="#0f172a" stroke="#d1d5db" strokeWidth="0.75"/>

                {/* Top Title */}
                <text x="60" y="12" textAnchor="middle" fontSize="7.5" fill="#ffffff" fontWeight="bold">Tiny RTC I2C</text>

                {/* Left Pins (Gold) & Holes (15px pitch) */}
                {[30, 45, 60, 75, 90].map(y => (
                    <circle key={`lpad-${y}`} cx="19.5" cy={y} r="1.875" fill="#0f172a" stroke="#fbbf24" strokeWidth="0.6" />
                ))}

                {/* Left Silkscreen */}
                <text x="25.5" y="32" textAnchor="start" fontSize="4.875" fill="#ffffff" fontWeight="bold">DS</text>
                <text x="25.5" y="47" textAnchor="start" fontSize="4.875" fill="#ffffff" fontWeight="bold">SCL</text>
                <text x="25.5" y="62" textAnchor="start" fontSize="4.875" fill="#ffffff" fontWeight="bold">SDA</text>
                <text x="25.5" y="77" textAnchor="start" fontSize="4.875" fill="#ffffff" fontWeight="bold">VCC</text>
                <text x="25.5" y="92" textAnchor="start" fontSize="4.875" fill="#ffffff" fontWeight="bold">GND</text>

                {/* Right Pins (Gold) & Holes (15px pitch) */}
                {[15, 30, 45, 60, 75, 90, 105].map(y => (
                    <circle key={`rpad-${y}`} cx="100.5" cy={y} r="1.875" fill="#0f172a" stroke="#fbbf24" strokeWidth="0.6" />
                ))}

                {/* Right Silkscreen */}
                <text x="94.5" y="17" textAnchor="end" fontSize="4.875" fill="#ffffff" fontWeight="bold">SQ</text>
                <text x="94.5" y="32" textAnchor="end" fontSize="4.875" fill="#ffffff" fontWeight="bold">DS</text>
                <text x="94.5" y="47" textAnchor="end" fontSize="4.875" fill="#ffffff" fontWeight="bold">SCL</text>
                <text x="94.5" y="62" textAnchor="end" fontSize="4.875" fill="#ffffff" fontWeight="bold">SDA</text>
                <text x="94.5" y="77" textAnchor="end" fontSize="4.875" fill="#ffffff" fontWeight="bold">VCC</text>
                <text x="94.5" y="92" textAnchor="end" fontSize="4.875" fill="#ffffff" fontWeight="bold">GND</text>
                <text x="94.5" y="107" textAnchor="end" fontSize="4.875" fill="#ffffff" fontWeight="bold">BAT</text>

                {/* Crystal (X1) */}
                <rect x="40.5" y="18.75" width="10.5" height="25.5" rx="5.25" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.1" />
                <path d="M 43.5 44.25 L 43.5 51 M 48 44.25 L 48 51" stroke="#94a3b8" strokeWidth="1.5" />
                <text x="38.25" y="28.5" textAnchor="end" fontSize="4" fill="#ffffff">X1</text>

                {/* Diode D1 */}
                <rect x="63.75" y="19.5" width="13.5" height="5.25" fill="#ef4444" stroke="#7f1d1d" strokeWidth="0.4"/>
                <rect x="74.25" y="19.5" width="3" height="5.25" fill="#111" />
                <text x="61.5" y="22.5" textAnchor="end" fontSize="4" fill="#ffffff">D1</text>
                
                {/* SMD Components */}
                <g fill="#111" stroke="#333" strokeWidth="0.4">
                    <rect x="63.75" y="31.5" width="7.5" height="3.75" rx="0.75"/>
                    <rect x="63.75" y="39" width="7.5" height="3.75" rx="0.75"/>
                    <rect x="63.75" y="46.5" width="7.5" height="3.75" rx="0.75"/>
                    <rect x="56.25" y="31.5" width="3.75" height="7.5" rx="0.75"/>
                    <rect x="56.25" y="42.75" width="3.75" height="7.5" rx="0.75"/>
                </g>

                {/* U1: Chip */}
                <rect x="33" y="61.5" width="15" height="12" rx="0.75" fill="#1e1e1e" />
                <text x="40.5" y="69" textAnchor="middle" fontSize="3.3" fill="#888">DS1307</text>
                <text x="31.5" y="69" textAnchor="end" fontSize="3.75" fill="#ffffff">U1</text>

                {/* U2: Chip */}
                <rect x="72" y="61.5" width="15" height="12" rx="0.75" fill="#1e1e1e" />
                <text x="79.5" y="69" textAnchor="middle" fontSize="3.3" fill="#888">24C32</text>
                <text x="88.5" y="69" textAnchor="start" fontSize="3.75" fill="#ffffff">U2</text>

                {/* Digital Screen */}
                <rect x="41.25" y="91.5" width="37.5" height="12" rx="1.1" fill="#0a0a0a" stroke="#111" strokeWidth="0.75" />
                <text x="60" y="97.5" textAnchor="middle" fontSize="4.5" fill={powered ? '#2ecc71' : '#14532d'} fontFamily="monospace" fontWeight="bold">
                    {timePart ?? '00:00:00'}
                </text>
                <text x="60" y="102" textAnchor="middle" fontSize="3.3" fill={powered ? '#68d391' : '#052e16'} fontFamily="monospace">
                    {datePart ?? '2024-01-01'}
                </text>
            </svg>
        </div>
    );
};
