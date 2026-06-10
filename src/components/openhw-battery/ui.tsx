import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 120, h: 120 };

export const BatteryContextMenu = ({ attrs, onUpdate }: { attrs: any, onUpdate: (key: string, value: any) => void }) => (
    <>
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>Capacity (mAh):</span>
        <input 
            type="number"
            value={attrs?.capacityMah || '2000'}
            onChange={e => onUpdate('capacityMah', e.target.value)}
            style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: 2, outline: 'none' }}
        />
    </>
);

export const BatteryUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const charge = state?.currentChargeMah ?? attrs?.currentChargeMah ?? 2000;
    const capacity = state?.capacityMah ?? attrs?.capacityMah ?? 2000;
    const percentage = Math.max(0, Math.min(100, Math.round((charge / capacity) * 100)));
    
    // Determine color based on charge level
    const chargeColor = percentage < 20 ? "#ef4444" : percentage < 50 ? "#f59e0b" : "#10b981";

    return (
        <div style={{
            width: BOUNDS.w,
            height: BOUNDS.h,
            pointerEvents: 'none',
            position: 'relative'
        }}>
            <svg
                width="100%"
                height="100%"
                viewBox="0 0 120 120"
                style={{ display: 'block' }}
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id="cellBody" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#1e3a8a" />
                        <stop offset="20%" stopColor="#2563eb" />
                        <stop offset="50%" stopColor="#3b82f6" />
                        <stop offset="80%" stopColor="#1d4ed8" />
                        <stop offset="100%" stopColor="#1e3a8a" />
                    </linearGradient>
                    <linearGradient id="cellHighlight" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                        <stop offset="25%" stopColor="rgba(255,255,255,0.4)" />
                        <stop offset="40%" stopColor="rgba(255,255,255,0)" />
                    </linearGradient>
                    <linearGradient id="metalTerminal" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#94a3b8" />
                        <stop offset="50%" stopColor="#f1f5f9" />
                        <stop offset="100%" stopColor="#64748b" />
                    </linearGradient>
                </defs>

                {/* --- Wiring --- */}
                {/* Red Wire (VCC) */}
                <path d="M 0 15 L 30 15" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
                {/* Black Wire (GND) curving to bottom */}
                <path d="M 0 45 C 15 45, 15 105, 30 105" fill="none" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" />

                {/* --- Battery Holder --- */}
                <rect x="25" y="5" width="65" height="110" rx="4" fill="#18181b" stroke="#27272a" strokeWidth="1" />
                {/* Spring at bottom */}
                <path d="M 45 105 L 75 105 M 45 108 L 75 108 M 45 111 L 75 111" fill="none" stroke="#64748b" strokeWidth="1.5" />
                {/* Top Contact Plate */}
                <rect x="50" y="5" width="20" height="4" fill="#64748b" />

                {/* --- LED Charge Indicator on Holder --- */}
                <rect x="30" y="15" width="4" height="90" rx="2" fill="#09090b" stroke="#27272a" strokeWidth="0.5" />
                <rect 
                    x="30" 
                    y={15 + (90 * (1 - percentage / 100))} 
                    width="4" 
                    height={90 * (percentage / 100)} 
                    rx="2" 
                    fill={chargeColor} 
                    style={{ filter: `drop-shadow(0px 0px 3px ${chargeColor})`, transition: 'all 0.3s ease' }}
                />

                {/* --- 18650 Li-ion Cell --- */}
                {/* Positive Terminal Insulator Ring */}
                <rect x="40" y="12" width="40" height="4" rx="1" fill="#f8fafc" />
                <rect x="42" y="12" width="36" height="4" fill="url(#metalTerminal)" />
                {/* Positive Bump */}
                <rect x="50" y="9" width="20" height="3" rx="1" fill="url(#metalTerminal)" />
                
                {/* Main Cylindrical Body (Blue Shrink Wrap) */}
                <rect x="40" y="14" width="40" height="92" rx="2" fill="url(#cellBody)" />
                {/* Top edge overlap of shrink wrap */}
                <rect x="40" y="14" width="40" height="1.5" fill="#1e3a8a" opacity="0.8" />
                
                {/* Glossy 3D Cylinder Highlight */}
                <rect x="40" y="14" width="40" height="92" rx="2" fill="url(#cellHighlight)" />

                {/* Printed Cell Markings */}
                <text x="72" y="60" fill="#ffffff" fontSize="6" fontWeight="bold" transform="rotate(-90, 72, 60)" opacity="0.7">18650 Li-ion 3.7V</text>
                <text x="60" y="60" fill="#ffffff" fontSize="10" fontWeight="bold" transform="rotate(-90, 60, 60)" opacity="0.9">{capacity}mAh</text>
                
                <text x="50" y="95" fill="#ffffff" fontSize="10" fontWeight="bold" transform="rotate(-90, 50, 95)" opacity="0.6">{percentage}%</text>

                {/* --- Breadboard Connection Pins --- */}
                {/* Gold Pins */}
                <circle cx="0" cy="15" r="2" fill="#FDE047" stroke="#CA8A04" strokeWidth="0.5" />
                <circle cx="0" cy="45" r="2" fill="#FDE047" stroke="#CA8A04" strokeWidth="0.5" />
                
                {/* Pin Labels */}
                <text x="4" y="13" fill="#ef4444" fontSize="6" fontWeight="bold" fontFamily="monospace">VCC</text>
                <text x="4" y="43" fill="#94a3b8" fontSize="6" fontWeight="bold" fontFamily="monospace">GND</text>
            </svg>
        </div>
    );
};
