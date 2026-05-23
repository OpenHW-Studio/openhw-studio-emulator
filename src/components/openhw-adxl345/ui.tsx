import React from 'react';

// Fits the board dimension
export const BOUNDS = { x: 0, y: 0, w: 94.5, h: 135 };

export const ADXL345ContextMenu = ({
    attrs,
    onUpdate,
}: {
    attrs: any;
    onUpdate: (key: string, value: any) => void;
}) => (
    <>
        <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 'bold' }}>Acceleration (g):</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            {['accelX', 'accelY', 'accelZ'].map(k => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, width: 12, color: 'var(--text2)' }}>
                        {k.replace('accel', '')}:
                    </span>
                    <input
                        type="range"
                        step="0.05"
                        min="-16"
                        max="16"
                        value={attrs?.[k] ?? (k === 'accelZ' ? '1' : '0')}
                        onChange={e => onUpdate(k, e.target.value)}
                        style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--border)' }}
                    />
                    <input
                        type="number"
                        step="0.1"
                        min="-16"
                        max="16"
                        value={attrs?.[k] ?? (k === 'accelZ' ? '1' : '0')}
                        onChange={e => onUpdate(k, e.target.value)}
                        style={{ width: 42, background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 4px', outline: 'none', fontSize: 10, textAlign: 'right' }}
                    />
                </div>
            ))}
        </div>
    </>
);

export const ADXL345UI = ({
    state,
    attrs,
}: {
    state: any;
    attrs: any;
}) => {
    const powered = state?.powered ?? false;
    const ax = parseFloat(state?.accelX ?? attrs?.accelX ?? 0).toFixed(2);
    const ay = parseFloat(state?.accelY ?? attrs?.accelY ?? 0).toFixed(2);
    const az = parseFloat(state?.accelZ ?? attrs?.accelZ ?? 1).toFixed(2);

    return (
        <div style={{ position: 'relative', width: 94.5, height: 135 }}>
            <svg width="94.5" height="135" viewBox="0 0 94.5 135" style={{ fontFamily: 'sans-serif' }}>
                {/* PCB Board - Deep Navy Blue */}
                <rect x="0" y="0" width="94.5" height="135" rx="4" fill="#0b2265" />
                <rect x="0" y="0" width="94.5" height="135" rx="4" fill="none" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="0.75" />

                {/* Gold Traces / Ground Planes (Subtle details) */}
                <path d="M 12 12 h 70.5 v 111 h -70.5 z" fill="none" stroke="#d4af37" strokeWidth="0.5" strokeOpacity="0.2" />

                {/* Mounting Holes (Top-Right and Bottom-Right) */}
                <circle cx="82.5" cy="15" r="4.5" fill="#1e293b" stroke="#e2e8f0" strokeWidth="0.75"/>
                <circle cx="82.5" cy="120" r="4.5" fill="#1e293b" stroke="#e2e8f0" strokeWidth="0.75"/>

                {/* Left Through-Hole Pads (15px pitch) with Gold Ring Plating */}
                {[15, 30, 45, 60, 75, 90, 105, 120].map(y => (
                    <g key={`pin-${y}`}>
                        <circle cx="6" cy={y} r="3" fill="#1a1a1a" stroke="#d4af37" strokeWidth="1.2" />
                        <circle cx="6" cy={y} r="1.2" fill="#ffffff" fillOpacity="0.2" />
                    </g>
                ))}

                {/* Left Silkscreen Pin Labels */}
                <g fill="#ffffff" fontSize="5.5" fontWeight="bold" textAnchor="start" opacity="0.9">
                    <text x="13.5" y={15 + 2}>GND</text>
                    <text x="13.5" y={30 + 2}>VCC</text>
                    <text x="13.5" y={45 + 2}>CS</text>
                    <text x="13.5" y={60 + 2}>INT1</text>
                    <text x="13.5" y={75 + 2}>INT2</text>
                    <text x="13.5" y={90 + 2}>SDO</text>
                    <text x="13.5" y={105 + 2}>SDA</text>
                    <text x="13.5" y={120 + 2}>SCL</text>
                </g>

                {/* XYZ Axis Indicator */}
                <g stroke="#ffffff" strokeWidth="0.75" fill="none" opacity="0.8">
                    {/* X-Axis: Downwards */}
                    <path d="M 60 102 L 60 114 m -2 -2 l 2 2 l 2 -2" strokeLinecap="round" strokeLinejoin="round" />
                    <text x="60" y="120" fill="#ffffff" fontSize="4.5" stroke="none" fontWeight="bold" textAnchor="middle">X</text>
                    
                    {/* Y-Axis: Rightwards */}
                    <path d="M 60 102 L 72 102 m -2 -2 l 2 2 l -2 2" strokeLinecap="round" strokeLinejoin="round" />
                    <text x="76" y="103.5" fill="#ffffff" fontSize="4.5" stroke="none" fontWeight="bold" textAnchor="start">Y</text>
                    
                    {/* Z-Axis: Out of Page (Circle with dot) */}
                    <circle cx="60" cy="102" r="2.25" />
                    <circle cx="60" cy="102" r="0.5" fill="#ffffff" stroke="none" />
                    <text x="54" y="103.5" fill="#ffffff" fontSize="4.5" stroke="none" fontWeight="bold" textAnchor="end">Z</text>
                </g>

                {/* ADXL345 Chip (PHIL 6838 345B) */}
                <g transform="translate(46, 52.5)">
                    <rect x="0" y="0" width="21" height="21" rx="1.5" fill="#1f2937" />
                    {/* Directional pin-1 dot */}
                    <circle cx="2.5" cy="2.5" r="0.75" fill="#4b5563" />
                    {/* Silkscreen text on the chip */}
                    <text x="10.5" y="6" textAnchor="middle" fontSize="2.8" fill="#d1d5db" fontFamily="monospace">PHIL</text>
                    <text x="10.5" y="10.5" textAnchor="middle" fontSize="2.8" fill="#d1d5db" fontFamily="monospace">6838</text>
                    <text x="10.5" y="15" textAnchor="middle" fontSize="2.8" fill="#d1d5db" fontFamily="monospace">345B</text>
                </g>

                {/* Passive Surface-Mount Components (Resistors & Capacitors) */}
                {/* Voltage regulator (3 pins) */}
                <rect x="36" y="22.5" width="4.5" height="7.5" fill="#1a1a1a" />
                <rect x="34.5" y="23.25" width="1.5" height="0.75" fill="#9ca3af" />
                <rect x="34.5" y="25.5" width="1.5" height="0.75" fill="#9ca3af" />
                <rect x="34.5" y="27.75" width="1.5" height="0.75" fill="#9ca3af" />
                <rect x="40.5" y="25.5" width="1.5" height="1.5" fill="#9ca3af" />

                {/* Resistor arrays/decoupling caps */}
                <rect x="52.5" y="18" width="6" height="3" fill="#b45309" /> {/* Tan Tantalum Cap */}
                <rect x="52.5" y="18" width="1.5" height="3" fill="#9ca3af" />
                <rect x="57" y="18" width="1.5" height="3" fill="#9ca3af" />

                <rect x="48" y="27" width="4.5" height="2.25" fill="#27272a" /> {/* Zero ohm resistor */}
                <text x="50.25" y="29.25" fontSize="1.8" fill="#71717a" textAnchor="middle">103</text>

                <rect x="55" y="27" width="4.5" height="2.25" fill="#27272a" />
                <text x="57.25" y="29.25" fontSize="1.8" fill="#71717a" textAnchor="middle">103</text>

                {/* Telemetry Display HUD */}
                <rect x="34.5" y="78" width="42" height="18" rx="1.5" fill="#090d16" stroke="#1e293b" strokeWidth="0.5" />
                <circle cx="72" cy="82" r="1" fill={powered ? '#10b981' : '#ef4444'} />
                
                <g fontSize="3.5" fontFamily="monospace" fill="#06b6d4">
                    <text x="36.5" y="83.5">X: {ax}g</text>
                    <text x="36.5" y="88.5">Y: {ay}g</text>
                    <text x="36.5" y="93.5">Z: {az}g</text>
                </g>
            </svg>
        </div>
    );
};
