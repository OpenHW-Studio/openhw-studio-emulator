import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 120, h: 75 };

export const A4988UI = ({ state, attrs }: { state: any, attrs: any }) => {
    return (
        <div style={{
            pointerEvents: 'none',
            width: BOUNDS.w,
            height: BOUNDS.h,
            position: 'relative'
        }}>
            <svg
                width="100%"
                height="100%"
                viewBox="0 0 120 75"
                style={{ display: 'block' }}
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* PCB Base */}
                <rect x="0" y="0" width="120" height="75" rx="3" fill="#b91c1c" stroke="#991b1b" strokeWidth="1" />
                
                {/* Silk Screen Borders / Details */}
                <rect x="2" y="2" width="116" height="71" rx="2" fill="none" stroke="#fca5a5" strokeWidth="0.5" opacity="0.3" />
                <circle cx="100" cy="47.5" r="0.8" fill="#fef08a" />
                <circle cx="104" cy="47.5" r="0.8" fill="#fef08a" />
                <circle cx="100" cy="51.5" r="0.8" fill="#fef08a" />
                <circle cx="104" cy="51.5" r="0.8" fill="#fef08a" />

                {/* Main Ceramic Capacitor */}
                <g transform="translate(100, 22)">
                    <rect x="-4" y="0" width="8" height="12" rx="1" fill="#b45309" />
                    <rect x="-4" y="0" width="8" height="2" rx="0.5" fill="#9ca3af" />
                    <rect x="-4" y="10" width="8" height="2" rx="0.5" fill="#9ca3af" />
                </g>

                {/* Sense Resistors (R100) */}
                <g transform="translate(70, 25)">
                    <rect x="-5" y="-2.5" width="10" height="5" fill="#111827" />
                    <rect x="-5" y="-2.5" width="1.5" height="5" fill="#9ca3af" />
                    <rect x="3.5" y="-2.5" width="1.5" height="5" fill="#9ca3af" />
                    <text x="0" y="1.5" fill="#fff" fontSize="2.5" fontWeight="bold" textAnchor="middle">R100</text>
                </g>
                <g transform="translate(70, 50)">
                    <rect x="-5" y="-2.5" width="10" height="5" fill="#111827" />
                    <rect x="-5" y="-2.5" width="1.5" height="5" fill="#9ca3af" />
                    <rect x="3.5" y="-2.5" width="1.5" height="5" fill="#9ca3af" />
                    <text x="0" y="1.5" fill="#fff" fontSize="2.5" fontWeight="bold" textAnchor="middle">R100</text>
                </g>

                {/* Trimpot (Potentiometer) */}
                <g transform="translate(90, 37.5)">
                    {/* Metal Base */}
                    <rect x="-6" y="-7" width="12" height="14" rx="1" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.5" />
                    {/* Circle rotor */}
                    <circle cx="0" cy="0" r="5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
                    <circle cx="0" cy="0" r="4" fill="#e2e8f0" />
                    {/* Cross slot */}
                    <path d="M -3 0 L 3 0 M 0 -3 L 0 3" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="-2.5" cy="-2.5" r="0.8" fill="#94a3b8" />
                </g>

                {/* A4988 IC */}
                <g transform="translate(42.5, 37.5)">
                    <rect x="-11" y="-11" width="22" height="22" rx="1.5" fill="#111827" stroke="#000" strokeWidth="0.5" />
                    <circle cx="-8" cy="-8" r="1.5" fill="#374151" />
                    <text x="0" y="2" fill="#4b5563" fontSize="4.5" fontWeight="bold" textAnchor="middle" transform="rotate(-90)">A4988</text>
                    {/* Silver IC Pads */}
                    <path d="M -9 -11 v 1 m 3 -1 v 1 m 3 -1 v 1 m 3 -1 v 1 m 3 -1 v 1 m 3 -1 v 1" stroke="#9ca3af" strokeWidth="1.2" />
                    <path d="M -9 10 v 1 m 3 -1 v 1 m 3 -1 v 1 m 3 -1 v 1 m 3 -1 v 1 m 3 -1 v 1" stroke="#9ca3af" strokeWidth="1.2" />
                    <path d="M -11 -9 h 1 m -1 3 h 1 m -1 3 h 1 m -1 3 h 1 m -1 3 h 1 m -1 3 h 1" stroke="#9ca3af" strokeWidth="1.2" />
                    <path d="M 10 -9 h 1 m -1 3 h 1 m -1 3 h 1 m -1 3 h 1 m -1 3 h 1 m -1 3 h 1" stroke="#9ca3af" strokeWidth="1.2" />
                </g>

                {/* Header Pins (Top Row) */}
                {[7.5, 22.5, 37.5, 52.5, 67.5, 82.5, 97.5, 112.5].map((x) => (
                    <g key={`top-pin-${x}`}>
                        <circle cx={x} cy="7.5" r="4" fill="#ca8a04" />
                        <circle cx={x} cy="7.5" r="3" fill="#fef08a" />
                        <circle cx={x} cy="7.5" r="1.8" fill="#111" />
                    </g>
                ))}

                {/* Header Pins (Bottom Row) */}
                {[7.5, 22.5, 37.5, 52.5, 67.5, 82.5, 97.5, 112.5].map((x) => (
                    <g key={`bot-pin-${x}`}>
                        <circle cx={x} cy="67.5" r="4" fill="#ca8a04" />
                        <circle cx={x} cy="67.5" r="3" fill="#fef08a" />
                        <circle cx={x} cy="67.5" r="1.8" fill="#111" />
                    </g>
                ))}

                {/* Top Labels */}
                {["DIR", "STEP", "SLP", "RST", "MS3", "MS2", "MS1", "EN"].map((label, i) => (
                    <text key={label} x={7.5 + i * 15} y="18" fill="white" fontSize="4.5" fontWeight="bold" textAnchor="middle">{label}</text>
                ))}

                {/* Bottom Labels */}
                {["GND", "VDD", "1B", "1A", "2A", "2B", "GND", "VMOT"].map((label, i) => (
                    <text key={`${label}-${i}`} x={7.5 + i * 15} y="59" fill="white" fontSize="4.5" fontWeight="bold" textAnchor="middle">{label}</text>
                ))}
            </svg>
        </div>
    );
};
