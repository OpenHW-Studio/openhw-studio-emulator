import React, { useState } from 'react';

// Defines the physical bounds for the simulator engine
export const BOUNDS = { x: 0, y: 0, w: 72, h: 50 };

// Context menu for part attributes (e.g., setting simulated readings)
export const BMP180ContextMenu = ({ attrs, onUpdate }: { attrs: any; onUpdate: (key: string, value: any) => void }) => (
    <>
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>Simulated Pressure (hPa):</span>
        <input
            type="number"
            value={attrs?.pressure ?? '1013.25'}
            step="0.1"
            onChange={e => onUpdate('pressure', e.target.value)}
            style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: 2, outline: 'none' }}
        />
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>Simulated Temperature (°C):</span>
        <input
            type="number"
            value={attrs?.temperature ?? '25.0'}
            step="0.1"
            onChange={e => onUpdate('temperature', e.target.value)}
            style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: 2, outline: 'none' }}
        />
    </>
);

export const BMP180UI = ({ state, attrs, onEvent }: { state: any; attrs: any; onEvent?: (event: any) => void }) => {
    // Simulator states for visual feedback
    const pressure = state?.pressure ?? attrs?.pressure ?? 1013.25;
    
    // Map pressure (typically 300 to 1100 hPa) to a visual scale
    const pressureScale = Math.max(0, Math.min(1, (pressure - 300) / 800));
    // Color transitions from thin air (light blue) to dense air (deep purple/magenta)
    const auraColor = `hsla(${240 - (pressureScale * 60)}, 80%, 60%, ${0.2 + (pressureScale * 0.4)})`;
    const auraRadius = 8 + (pressureScale * 4);

    return (
        <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h }}>
            <svg
                viewBox="0 0 72 50"
                width="100%"
                height="100%"
                style={{ cursor: 'pointer', display: 'block', pointerEvents: 'none' }}
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id="enigGold" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#FDE047" />
                        <stop offset="50%" stopColor="#EAB308" />
                        <stop offset="100%" stopColor="#CA8A04" />
                    </linearGradient>
                    <linearGradient id="brushedMetal" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#F1F5F9" />
                        <stop offset="30%" stopColor="#CBD5E1" />
                        <stop offset="50%" stopColor="#E2E8F0" />
                        <stop offset="70%" stopColor="#94A3B8" />
                        <stop offset="100%" stopColor="#F8FAFC" />
                    </linearGradient>
                    <radialGradient id="sensorHole" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#000000" />
                        <stop offset="70%" stopColor="#1E293B" />
                        <stop offset="100%" stopColor="#475569" />
                    </radialGradient>
                    <linearGradient id="pcbBase" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1E3A8A" />
                        <stop offset="100%" stopColor="#172554" />
                    </linearGradient>
                </defs>

                {/* Deep Blue PCB Background */}
                <rect x="1" y="1" width="70" height="48" rx="4" ry="4" fill="url(#pcbBase)" stroke="#1E40AF" strokeWidth="0.5" />

                {/* Trace routing (lighter blue simulating copper under mask) */}
                <path d="M 10 38 L 10 46 M 25 38 L 25 46 M 40 38 L 40 46 M 55 38 L 55 46" fill="none" stroke="#2563EB" strokeWidth="1.5" opacity="0.6" strokeLinecap="round" />
                <path d="M 10 38 L 22 26 L 36 26" fill="none" stroke="#2563EB" strokeWidth="1" opacity="0.4" />
                <path d="M 40 38 L 44 32 L 44 26" fill="none" stroke="#2563EB" strokeWidth="1" opacity="0.4" />
                <path d="M 55 38 L 50 32 L 50 26" fill="none" stroke="#2563EB" strokeWidth="1" opacity="0.4" />

                {/* Mounting Holes (Plated with ENIG Gold) */}
                <circle cx="8" cy="8" r="3.5" fill="url(#enigGold)" />
                <circle cx="8" cy="8" r="2.5" fill="#111827" /> {/* Through-hole */}
                <circle cx="64" cy="8" r="3.5" fill="url(#enigGold)" />
                <circle cx="64" cy="8" r="2.5" fill="#111827" />

                {/* --- Surface Mount Components --- */}
                {/* 3.3V Voltage Regulator (SOT-23) */}
                <rect x="15" y="14" width="5" height="7" fill="#111827" rx="0.5" />
                <rect x="14" y="14.5" width="1" height="1.5" fill="#94A3B8" />
                <rect x="14" y="19" width="1" height="1.5" fill="#94A3B8" />
                <rect x="20" y="16.75" width="1" height="1.5" fill="#94A3B8" />

                {/* I2C Pull-up Resistors (0603 footprint) */}
                <g transform="translate(36, 12)">
                    <rect x="0" y="0" width="2" height="4" fill="#0F172A" rx="0.2" />
                    <rect x="0" y="0" width="2" height="0.8" fill="#94A3B8" rx="0.2" />
                    <rect x="0" y="3.2" width="2" height="0.8" fill="#94A3B8" rx="0.2" />
                </g>
                <g transform="translate(41, 12)">
                    <rect x="0" y="0" width="2" height="4" fill="#0F172A" rx="0.2" />
                    <rect x="0" y="0" width="2" height="0.8" fill="#94A3B8" rx="0.2" />
                    <rect x="0" y="3.2" width="2" height="0.8" fill="#94A3B8" rx="0.2" />
                </g>

                {/* Decoupling Capacitors (Brown ceramic) */}
                <g transform="translate(25, 12)">
                    <rect x="0" y="0" width="2" height="4" fill="#A16207" rx="0.2" />
                    <rect x="0" y="0" width="2" height="0.8" fill="#94A3B8" rx="0.2" />
                    <rect x="0" y="3.2" width="2" height="0.8" fill="#94A3B8" rx="0.2" />
                </g>

                {/* --- BMP180 Sensor Package --- */}
                {/* Dynamic Atmospheric Pressure Aura */}
                <circle cx="36" cy="27" r={auraRadius} fill={auraColor} style={{ filter: 'blur(3px)', mixBlendMode: 'screen', transition: 'all 0.3s ease' }} />

                {/* Metal Can Package */}
                <rect x="30" y="21" width="12" height="12" rx="1.5" fill="url(#brushedMetal)" stroke="#64748B" strokeWidth="0.5" />
                
                {/* Pressure Port (Deep hole) */}
                <circle cx="39" cy="24" r="1.5" fill="url(#sensorHole)" />
                <circle cx="39" cy="24" r="0.8" fill="#000" />
                
                {/* Engraved Silicon Markings */}
                <text x="36" y="29.5" fontFamily="sans-serif" fontSize="2.5" fill="#64748B" fontWeight="bold" textAnchor="middle" style={{ opacity: 0.8 }}>BMP</text>
                <text x="36" y="32" fontFamily="sans-serif" fontSize="2" fill="#64748B" textAnchor="middle" style={{ opacity: 0.8 }}>180</text>

                {/* --- Breadboard Connection Pins --- */}
                {/* ENIG Gold Plated Pads */}
                {[10, 25, 40, 55].map((x) => (
                    <rect key={`pad-${x}`} x={x - 2.5} y="44" width="5" height="5" fill="url(#enigGold)" rx="1" />
                ))}

                {/* Physical Male Header Pins extending out */}
                {[10, 25, 40, 55].map((x) => (
                    <path key={`pin-${x}`} d={`M ${x - 0.8} 46.5 L ${x - 0.8} 49.5 A 0.8 0.8 0 0 0 ${x + 0.8} 49.5 L ${x + 0.8} 46.5 Z`} fill="url(#brushedMetal)" />
                ))}

                {/* Exact Anchor Points at y=48 */}
                {[10, 25, 40, 55].map((x) => (
                    <circle key={`anchor-${x}`} cx={x} cy="48" r="1.2" fill="#111827" />
                ))}

                {/* Silkscreen Pin Labels */}
                <text x="10" y="42" fontFamily="monospace" fontSize="4.5" fontWeight="bold" fill="#F8FAFC" textAnchor="middle">VIN</text>
                <text x="25" y="42" fontFamily="monospace" fontSize="4.5" fontWeight="bold" fill="#F8FAFC" textAnchor="middle">GND</text>
                <text x="40" y="42" fontFamily="monospace" fontSize="4.5" fontWeight="bold" fill="#F8FAFC" textAnchor="middle">SCL</text>
                <text x="55" y="42" fontFamily="monospace" fontSize="4.5" fontWeight="bold" fill="#F8FAFC" textAnchor="middle">SDA</text>
                
                {/* Board Identifier Silkscreen */}
                <text x="36" y="6" fontFamily="sans-serif" fontSize="3" fontWeight="bold" fill="#F8FAFC" textAnchor="middle" opacity="0.8">BMP180 Breakout</text>

            </svg>
        </div>
    );
};
