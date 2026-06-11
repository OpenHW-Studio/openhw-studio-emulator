import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 90, h: 150 };

const LEFT_PINS = ['EN1,2', 'IN1', 'OUT1', 'GND1', 'GND2', 'OUT2', 'IN2', 'VCC2'];
const RIGHT_PINS = ['VCC1', 'IN4', 'OUT4', 'GND4', 'GND3', 'OUT3', 'IN3', 'EN3,4'];

export const L293DUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const isActive = state?.active;

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
                viewBox="0 0 90 150"
                style={{ display: 'block' }}
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id="icPin" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#94a3b8" />
                        <stop offset="50%" stopColor="#e2e8f0" />
                        <stop offset="100%" stopColor="#64748b" />
                    </linearGradient>
                    <linearGradient id="icPinRight" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#64748b" />
                        <stop offset="50%" stopColor="#e2e8f0" />
                        <stop offset="100%" stopColor="#94a3b8" />
                    </linearGradient>
                    <radialGradient id="thermalGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                        <stop offset="50%" stopColor="#b91c1c" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="#111827" stopOpacity="0" />
                    </radialGradient>
                </defs>

                {/* Left Pins (Metallic Shoulders and Legs) */}
                {LEFT_PINS.map((label, i) => {
                    const y = 15 + i * 15;
                    return (
                        <g key={`L${i}`}>
                            <rect x="16" y={y - 3} width="7" height="6" fill="url(#icPin)" rx="0.5" />
                            <rect x="13.5" y={y - 1.5} width="3" height="3" fill="#64748b" rx="0.5" />
                            <circle cx="15" cy={y} r="1.5" fill="#000" opacity="0.5" />
                        </g>
                    );
                })}

                {/* Right Pins */}
                {RIGHT_PINS.map((label, i) => {
                    const y = 15 + i * 15;
                    return (
                        <g key={`R${i}`}>
                            <rect x="67" y={y - 3} width="7" height="6" fill="url(#icPinRight)" rx="0.5" />
                            <rect x="73.5" y={y - 1.5} width="3" height="3" fill="#64748b" rx="0.5" />
                            <circle cx="75" cy={y} r="1.5" fill="#000" opacity="0.5" />
                        </g>
                    );
                })}

                {/* Main IC Body (Epoxy Resin) */}
                <rect x="22" y="5" width="46" height="125" rx="3" fill="#111827" stroke="#0f172a" strokeWidth="1" />
                <rect x="23" y="6" width="44" height="123" rx="2" fill="none" stroke="#334155" strokeWidth="0.5" opacity="0.5" />

                {/* Thermal Glow Overlay (Active State) */}
                {isActive && (
                    <rect x="22" y="5" width="46" height="125" rx="3" fill="url(#thermalGlow)" style={{ mixBlendMode: 'screen' }} />
                )}

                {/* Pin 1 Indicators */}
                <path d="M 37 5 A 8 8 0 0 0 53 5" fill="#0f172a" stroke="#111827" />
                <circle cx="30" cy="15" r="2.5" fill="#1e293b" />
                <circle cx="30" cy="15" r="2" fill="#0f172a" />

                {/* Left Pin Labels */}
                {LEFT_PINS.map((label, i) => (
                    <text key={`Lt${i}`} x="25" y={15 + i * 15 + 1.5} fontSize="4.5" fontFamily="monospace" fill="#94a3b8" textAnchor="start" fontWeight="bold">{label}</text>
                ))}

                {/* Right Pin Labels */}
                {RIGHT_PINS.map((label, i) => (
                    <text key={`Rt${i}`} x="65" y={15 + i * 15 + 1.5} fontSize="4.5" fontFamily="monospace" fill="#94a3b8" textAnchor="end" fontWeight="bold">{label}</text>
                ))}

                {/* Center Branding */}
                <g transform="translate(45, 67.5) rotate(-90)">
                    <text x="0" y="3" fontSize="10" fill="#cbd5e1" fontWeight="900" textAnchor="middle" style={{ letterSpacing: '1px' }}>L293D</text>
                </g>
            </svg>
        </div>
    );
};
