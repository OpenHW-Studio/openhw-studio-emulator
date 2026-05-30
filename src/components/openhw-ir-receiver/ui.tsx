import React, { useState } from 'react';

// Adjusted bounds for the vertical footprint
export const BOUNDS = { x: 0, y: 0, w: 100, h: 150 };

const REMOTE_BUTTONS = [
    ['POWER'],
    ['VOL+', 'MUTE',  'CH+'],
    ['VOL-', 'OK',    'CH-'],
    ['1',    '2',     '3'],
    ['4',    '5',     '6'],
    ['7',    '8',     '9'],
    ['LEFT', '0',  'RIGHT'],
    ['UP', 'DOWN'],
];

export const IRReceiverContextMenu = ({ attrs, onUpdate }: { attrs: any; onUpdate: (key: string, value: any) => void }) => (
    <>
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>Frequency (kHz):</span>
        <select
            value={attrs?.frequency ?? '38'}
            onChange={e => onUpdate('frequency', e.target.value)}
            style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: 2, outline: 'none' }}
        >
            <option value="38">38 kHz (standard)</option>
            <option value="36">36 kHz</option>
            <option value="40">40 kHz</option>
            <option value="56">56 kHz</option>
        </select>
    </>
);

export const IRReceiverUI = ({ state, attrs, onEvent }: { state: any; attrs: any; onEvent?: (event: any) => void }) => {
    const powered      = state?.powered      ?? false;
    const transmitting = state?.transmitting ?? false;
    const lastButton   = state?.lastButton   ?? '';
    const [showRemote, setShowRemote] = useState(false);

    const sendButton = (btn: string) => {
        onEvent?.({ type: 'ir-send', button: btn });
    };

    return (
        <div style={{ position: 'relative', width: 100, height: 150 }}>
            <svg
                viewBox="0 0 200 300"
                width="100%"
                height="100%"
                style={{ cursor: 'pointer', display: 'block' }}
                onClick={() => setShowRemote(s => !s)}
            >
                {/* PCB Base */}
                <rect x="20" y="20" width="160" height="190" fill="#111318" rx="6" />
                {/* Inner White Silkscreen Border */}
                <rect x="25" y="25" width="150" height="180" fill="none" stroke="#f3f4f6" strokeWidth="2" rx="3" />
                
                {/* Mounting Holes */}
                <circle cx="45" cy="45" r="10" fill="#374151" />
                <circle cx="45" cy="45" r="5" fill="#e2e8f0" />
                <circle cx="155" cy="185" r="10" fill="#374151" />
                <circle cx="155" cy="185" r="5" fill="#e2e8f0" />

                {/* IR Symbol (Top Right) */}
                <path d="M 145 55 Q 155 45 165 55 M 140 45 Q 155 30 170 45 M 135 35 Q 155 15 175 35" fill="none" stroke="#f3f4f6" strokeWidth="2" strokeLinecap="round" />

                {/* --- Bottom Pins --- */}
                <g>
                    {/* Pin 1 (Left / G) */}
                    <rect x="66" y="230" width="8" height="60" fill="#9ca3af" rx="2" />
                    <rect x="66" y="230" width="3" height="60" fill="#f3f4f6" rx="1" />
                    
                    {/* Pin 2 (Middle / V) */}
                    <rect x="96" y="230" width="8" height="60" fill="#9ca3af" rx="2" />
                    <rect x="96" y="230" width="3" height="60" fill="#f3f4f6" rx="1" />

                    {/* Pin 3 (Right / R) */}
                    <rect x="126" y="230" width="8" height="60" fill="#9ca3af" rx="2" />
                    <rect x="126" y="230" width="3" height="60" fill="#f3f4f6" rx="1" />
                </g>

                {/* Black Plastic Header Block */}
                <rect x="50" y="210" width="100" height="20" fill="#030712" rx="3" />
                <rect x="55" y="200" width="90" height="10" fill="#1f2937" rx="2" />

                {/* Silkscreen Pin Labels (G, V, R) */}
                <text x="70" y="200" fill="#f3f4f6" fontSize="22" fontFamily="monospace" fontWeight="bold" textAnchor="middle">G</text>
                <text x="100" y="200" fill="#f3f4f6" fontSize="22" fontFamily="monospace" fontWeight="bold" textAnchor="middle">V</text>
                <text x="130" y="200" fill="#f3f4f6" fontSize="22" fontFamily="monospace" fontWeight="bold" textAnchor="middle">R</text>

                {/* Silkscreen secondary labels (-, +, S) */}
                <text x="70" y="145" fill="#f3f4f6" fontSize="18" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">-</text>
                <text x="100" y="145" fill="#f3f4f6" fontSize="16" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">+</text>
                <text x="130" y="145" fill="#f3f4f6" fontSize="16" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">S</text>

                {/* Vias/Pads next to labels */}
                <circle cx="70" cy="165" r="8" fill="#9ca3af" />
                <circle cx="70" cy="165" r="4" fill="#4b5563" />
                <circle cx="100" cy="165" r="8" fill="#9ca3af" />
                <circle cx="100" cy="165" r="4" fill="#4b5563" />
                <circle cx="130" cy="165" r="8" fill="#9ca3af" />
                <circle cx="130" cy="165" r="4" fill="#4b5563" />

                {/* Vias Outline Box */}
                <rect x="58" y="152" width="84" height="26" fill="none" stroke="#f3f4f6" strokeWidth="1.5" />

                {/* Component Outlines (Left & Right) */}
                <rect x="30" y="85" width="20" height="35" fill="none" stroke="#f3f4f6" strokeWidth="1.5" />
                <rect x="150" y="85" width="20" height="35" fill="none" stroke="#f3f4f6" strokeWidth="1.5" />
                
                {/* SMD Resistor (102) - Left */}
                <rect x="34" y="90" width="12" height="25" fill="#1f2937" rx="1" />
                <rect x="34" y="90" width="12" height="5" fill="#d1d5db" rx="1" />
                <rect x="34" y="110" width="12" height="5" fill="#d1d5db" rx="1" />
                <text x="40" y="105" fill="#e5e7eb" fontSize="8" fontFamily="monospace" textAnchor="middle" transform="rotate(-90 40 105)">102</text>

                {/* SMD LED - Right - Tied to 'powered' state */}
                <rect x="154" y="90" width="12" height="25" fill="#f8fafc" rx="1" />
                <rect x="154" y="90" width="12" height="5" fill="#d1d5db" rx="1" />
                <rect x="154" y="110" width="12" height="5" fill="#d1d5db" rx="1" />
                <circle cx="160" cy="102" r="4" fill={powered ? "#10b981" : "#064e3b"} />

                {/* IR Receiver Component (VS1838B) - Top Center */}
                {/* Base metal shield */}
                <rect x="60" y="85" width="80" height="50" fill="#4b5563" rx="3" stroke="#374151" strokeWidth="2" />
                
                {/* IR Dome - Tied to 'transmitting' state */}
                <path d="M 70 85 C 70 50, 130 50, 130 85 Z" fill={transmitting ? '#ef4444' : '#1f2937'} />
                <path d="M 80 85 C 80 60, 120 60, 120 85 Z" fill={transmitting ? '#fca5a5' : '#111827'} />

                {/* 1838 Text inside metal shield */}
                <text x="100" y="115" fill="#9ca3af" fontSize="18" fontFamily="monospace" fontWeight="bold" textAnchor="middle" letterSpacing="2">
                    1838
                </text>
            </svg>

            {/* Virtual remote popup */}
            {showRemote && (
                <div style={{
                    position: 'absolute', top: 110, left: -20,
                    zIndex: 1000,
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8, padding: 8,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                    minWidth: 110,
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 'bold' }}>IR Remote</span>
                        <button
                            onClick={() => setShowRemote(false)}
                            style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 12 }}
                        >✕</button>
                    </div>

                    {REMOTE_BUTTONS.map((row, ri) => (
                        <div key={ri} style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 4 }}>
                            {row.map(btn => (
                                <button
                                    key={btn}
                                    onMouseDown={() => sendButton(btn)}
                                    disabled={!powered}
                                    style={{
                                        width: btn === 'POWER' ? 50 : 30,
                                        height: 22,
                                        background: btn === 'POWER' ? '#e74c3c' : lastButton === btn ? '#2980b9' : '#2c3e50',
                                        color: '#fff',
                                        border: 'none', borderRadius: 4,
                                        fontSize: 8, fontWeight: 'bold',
                                        cursor: powered ? 'pointer' : 'not-allowed',
                                        opacity: powered ? 1 : 0.4,
                                        transition: 'background 0.1s',
                                    }}
                                >
                                    {btn}
                                </button>
                            ))}
                        </div>
                    ))}

                    {!powered && (
                        <div style={{ fontSize: 9, color: '#e74c3c', textAlign: 'center', marginTop: 4 }}>
                            Connect V to power
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
