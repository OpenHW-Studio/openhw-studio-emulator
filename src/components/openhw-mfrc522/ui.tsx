import React from 'react';

// Adjusted bounds to fit the board without external pins (15px grid aligned)
export const BOUNDS = { x: 0, y: 0, w: 165, h: 135 };

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
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>Card UID:</span>
        <input
            type="text"
            value={attrs?.cardUID ?? 'DE AD BE EF'}
            onChange={e => onUpdate('cardUID', e.target.value)}
            style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: 2, outline: 'none' }}
        />
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
        <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h }}>
            <svg width="100%" height="100%" viewBox={`0 0 ${BOUNDS.w} ${BOUNDS.h}`} style={{ fontFamily: 'sans-serif' }}>
                {/* PCB Base */}
                <rect x="0" y="0" width={BOUNDS.w} height={BOUNDS.h} rx="4" fill="#0d47a1" />
                <rect x="0" y="0" width={BOUNDS.w} height={BOUNDS.h} rx="4" fill="none" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="1" />

                {/* Mounting Holes */}
                <circle cx="10" cy="10" r="3.5" fill="#0f172a" stroke="#d1d5db" strokeWidth="1"/>
                <circle cx={BOUNDS.w - 10} cy="10" r="3.5" fill="#0f172a" stroke="#d1d5db" strokeWidth="1"/>
                <circle cx="10" cy={BOUNDS.h - 10} r="3.5" fill="#0f172a" stroke="#d1d5db" strokeWidth="1"/>
                <circle cx={BOUNDS.w - 10} cy={BOUNDS.h - 10} r="3.5" fill="#0f172a" stroke="#d1d5db" strokeWidth="1"/>

                {/* Left Through-Hole Pads */}
                {[15, 30, 45, 60, 75, 90, 105, 120].map(y => (
                    <circle key={`pin-${y}`} cx="15" cy={y} r="2.5" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.2" />
                ))}

                {/* Left Silkscreen Pin Labels */}
                <g fill="#ffffff" fontSize="7.5" fontWeight="bold" textAnchor="start">
                    <text x="23" y={15 + 2.5}>3V3</text>
                    <text x="23" y={30 + 2.5}>RST</text>
                    <text x="23" y={45 + 2.5}>GND</text>
                    <text x="23" y={60 + 2.5}>IRQ</text>
                    <text x="23" y={75 + 2.5}>MISO</text>
                    <text x="23" y={90 + 2.5}>MOSI</text>
                    <text x="23" y={105 + 2.5}>SCK</text>
                    <text x="23" y={120 + 2.5}>SDA</text>
                </g>

                {/* RFID Antenna Traces */}
                <g fill="none" stroke="#2a64b5" strokeWidth="1.5">
                    <rect x="75" y="23.5" width="74" height="88" rx="8" />
                    <rect x="79" y="27.5" width="66" height="80" rx="6" />
                    <rect x="83" y="31.5" width="58" height="72" rx="4" />
                    <rect x="87" y="35.5" width="50" height="64" rx="2" />
                    <rect x="91" y="39.5" width="42" height="56" rx="1" />
                </g>

                {/* Silkscreen Text */}
                <text x="159" y="67.5" transform="rotate(-90 159 67.5)" textAnchor="middle" fontSize="8" fill="#ffffff" fontWeight="bold">RFID-RC522</text>
                <text x="112" y="16" textAnchor="middle" fontSize="6" fill="#ffffff">13.56 MHz</text>

                {/* MFRC522 Chip */}
                <rect x="40" y="53.5" width="28" height="28" rx="1.5" fill="#1e1e1e" />
                {/* Chip Pins */}
                <path d="M 39 57.5 v 20 m 30 -20 v 20 m -25 -5 h 20 m -20 30 h 20" stroke="#888" strokeWidth="1.5" strokeDasharray="1, 1.5"/>
                <circle cx="43" cy="56.5" r="1" fill="#333" />
                <text x="54" y="66.5" textAnchor="middle" fontSize="4.5" fill="#aaa">MFRC522</text>
                <text x="54" y="73.5" textAnchor="middle" fontSize="3.5" fill="#888">NXP</text>
                <text x="54" y="50.5" textAnchor="middle" fontSize="4.5" fill="#ffffff">U1</text>

                {/* Crystal Oscillator */}
                <rect x="45" y="29.5" width="18" height="8" rx="4" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
                <text x="54" y="35" textAnchor="middle" fontSize="3.5" fill="#475569">27.120</text>
                <rect x="49" y="37.5" width="1.5" height="4" fill="#94a3b8" />
                <rect x="57" y="37.5" width="1.5" height="4" fill="#94a3b8" />
                <text x="40" y="34.5" textAnchor="end" fontSize="4.5" fill="#ffffff">X1</text>

                {/* Decorative SMD Components */}
                <rect x="42" y="89.5" width="6" height="3" fill="#111" />
                <rect x="52" y="89.5" width="6" height="3" fill="#111" />
                <rect x="62" y="89.5" width="6" height="3" fill="#111" />
                <text x="45" y="96.5" textAnchor="middle" fontSize="3.5" fill="#ffffff">C1</text>
                <text x="55" y="96.5" textAnchor="middle" fontSize="3.5" fill="#ffffff">R1</text>
                <text x="65" y="96.5" textAnchor="middle" fontSize="3.5" fill="#ffffff">R2</text>
                
                {/* Status LED */}
                <rect x="60" y="30.5" width="4" height="6" fill="#ef4444" stroke="#7f1d1d" strokeWidth="0.5" />
                <circle cx="62" cy="33.5" r="1" fill="#fca5a5" />
                <text x="62" y="27.5" textAnchor="middle" fontSize="4" fill="#fff">D1</text>

                {/* Ripple Present Visual */}
                {cardPresent && (
                    <g transform="translate(112, 67.5)" fill="none" stroke="#ffffff" strokeWidth="0.6">
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
