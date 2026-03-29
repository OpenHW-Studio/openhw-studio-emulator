import React from 'react';

// Adjusted bounds to fit the board without external pins
export const BOUNDS = { x: 0, y: 0, w: 156, h: 120 };

export const MFRC522ContextMenu = ({
    attrs,
    onUpdate,
}: {
    attrs: any;
    onUpdate: (key: string, value: any) => void;
}) => (
    <>
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>Card Present:</span>
        <select
            value={attrs?.cardPresent ?? 'false'}
            onChange={e => onUpdate('cardPresent', e.target.value)}
            style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: 2, outline: 'none' }}
        >
            <option value="false">No card</option>
            <option value="true">Card present</option>
        </select>
    </>
);

export const MFRC522UI = ({
    state,
    attrs,
}: {
    state: any;
    attrs: any;
}) => {
    const cardPresent = state?.cardPresent ?? (attrs?.cardPresent === 'true');

    return (
        <div style={{ position: 'relative', width: 156, height: 120 }}>
            <svg width="156" height="120" viewBox="0 0 156 120" style={{ fontFamily: 'sans-serif' }}>
                {/* PCB Base */}
                <rect x="0" y="0" width="156" height="120" rx="4" fill="#0d47a1" />
                <rect x="0" y="0" width="156" height="120" rx="4" fill="none" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="1" />

                {/* Mounting Holes */}
                <circle cx="10" cy="10" r="3.5" fill="#0f172a" stroke="#d1d5db" strokeWidth="1"/>
                <circle cx="146" cy="10" r="3.5" fill="#0f172a" stroke="#d1d5db" strokeWidth="1"/>
                <circle cx="10" cy="110" r="3.5" fill="#0f172a" stroke="#d1d5db" strokeWidth="1"/>
                <circle cx="146" cy="110" r="3.5" fill="#0f172a" stroke="#d1d5db" strokeWidth="1"/>

                {/* Left Through-Hole Pads */}
                {[18, 30, 42, 54, 66, 78, 90, 102].map(y => (
                    <circle key={`pin-${y}`} cx="8" cy={y} r="2.5" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.2" />
                ))}

                {/* Left Silkscreen Pin Labels */}
                <g fill="#ffffff" fontSize="7.5" fontWeight="bold" textAnchor="start">
                    <text x="16" y={18 + 2.5}>3V3</text>
                    <text x="16" y={30 + 2.5}>RST</text>
                    <text x="16" y={42 + 2.5}>GND</text>
                    <text x="16" y={54 + 2.5}>IRQ</text>
                    <text x="16" y={66 + 2.5}>MISO</text>
                    <text x="16" y={78 + 2.5}>MOSI</text>
                    <text x="16" y={90 + 2.5}>SCK</text>
                    <text x="16" y={102 + 2.5}>SDA</text>
                </g>

                {/* RFID Antenna Traces */}
                <g fill="none" stroke="#2a64b5" strokeWidth="1.5">
                    <rect x="71" y="16" width="74" height="88" rx="8" />
                    <rect x="75" y="20" width="66" height="80" rx="6" />
                    <rect x="79" y="24" width="58" height="72" rx="4" />
                    <rect x="83" y="28" width="50" height="64" rx="2" />
                    <rect x="87" y="32" width="42" height="56" rx="1" />
                </g>

                {/* Silkscreen Text - Perfectly centered on the right edge */}
                <text x="150" y="60" transform="rotate(-90 150 60)" textAnchor="middle" fontSize="8" fill="#ffffff" fontWeight="bold">RFID-RC522</text>
                <text x="108" y="12" textAnchor="middle" fontSize="6" fill="#ffffff">13.56 MHz</text>

                {/* MFRC522 Chip */}
                <rect x="40" y="46" width="28" height="28" rx="1.5" fill="#1e1e1e" />
                {/* Chip Pins */}
                <path d="M 39 50 v 20 m 30 -20 v 20 m -25 -5 h 20 m -20 30 h 20" stroke="#888" strokeWidth="1.5" strokeDasharray="1, 1.5"/>
                <circle cx="43" cy="49" r="1" fill="#333" />
                <text x="54" y="59" textAnchor="middle" fontSize="4.5" fill="#aaa">MFRC522</text>
                <text x="54" y="66" textAnchor="middle" fontSize="3.5" fill="#888">NXP</text>
                <text x="54" y="43" textAnchor="middle" fontSize="4.5" fill="#ffffff">U1</text>

                {/* Crystal Oscillator */}
                <rect x="45" y="22" width="18" height="8" rx="4" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
                <text x="54" y="27.5" textAnchor="middle" fontSize="3.5" fill="#475569">27.120</text>
                <rect x="49" y="30" width="1.5" height="4" fill="#94a3b8" />
                <rect x="57" y="30" width="1.5" height="4" fill="#94a3b8" />
                <text x="40" y="27" textAnchor="end" fontSize="4.5" fill="#ffffff">X1</text>

                {/* Decorative SMD Components */}
                <rect x="42" y="82" width="6" height="3" fill="#111" />
                <rect x="52" y="82" width="6" height="3" fill="#111" />
                <rect x="62" y="82" width="6" height="3" fill="#111" />
                <text x="45" y="89" textAnchor="middle" fontSize="3.5" fill="#ffffff">C1</text>
                <text x="55" y="89" textAnchor="middle" fontSize="3.5" fill="#ffffff">R1</text>
                <text x="65" y="89" textAnchor="middle" fontSize="3.5" fill="#ffffff">R2</text>
                
                {/* Status LED */}
                <rect x="60" y="23" width="4" height="6" fill="#ef4444" stroke="#7f1d1d" strokeWidth="0.5" />
                <circle cx="62" cy="26" r="1" fill="#fca5a5" />
                <text x="62" y="20" textAnchor="middle" fontSize="4" fill="#fff">D1</text>

                {/* Ripple Present Visual */}
                {cardPresent && (
                    <g transform="translate(108, 60)" fill="none" stroke="#ffffff" strokeWidth="0.6">
                        <circle r="12" opacity="0.35" />
                        <circle r="22" opacity="0.25" />
                        <circle r="32" opacity="0.18" />
                        <circle r="42" opacity="0.12" />
                        <circle r="52" opacity="0.08" />
                        <circle r="62" opacity="0.04" />
                        <circle r="72" opacity="0.01" />
                    </g>
                )}
            </svg>
        </div>
    );
};