import React from 'react';

// Standard Motor dimensions mapping to manifest
export const BOUNDS = { x: 0, y: 0, w: 100, h: 50 };

export const MotorUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const speed = state?.speed || 0;
    const animationDuration = speed === 0 ? '0s' : `${Math.abs(1 / speed)}s`;
    const direction = speed < 0 ? 'reverse' : 'normal';

    return (
        <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h, pointerEvents: 'none' }}>
            <svg width="100" height="50" viewBox="0 0 100 50">
                <defs>
                    <linearGradient id="metalBody" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#E0E0E0" />
                        <stop offset="20%" stopColor="#FFFFFF" />
                        <stop offset="50%" stopColor="#9E9E9E" />
                        <stop offset="80%" stopColor="#616161" />
                        <stop offset="100%" stopColor="#424242" />
                    </linearGradient>
                    <linearGradient id="plasticCap" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#D32F2F" />
                        <stop offset="100%" stopColor="#B71C1C" />
                    </linearGradient>
                    <linearGradient id="shaftMetal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#BDBDBD" />
                        <stop offset="50%" stopColor="#EEEEEE" />
                        <stop offset="100%" stopColor="#757575" />
                    </linearGradient>
                </defs>

                {/* Drop Shadow Base */}
                <rect x="15" y="10" width="70" height="34" rx="4" fill="rgba(0,0,0,0.3)" filter="blur(2px)" />

                {/* Terminals extending to x=0 */}
                <path d="M 0 15 L 20 15" stroke="#BDBDBD" strokeWidth="4" strokeLinecap="round" />
                <path d="M 0 45 L 20 45" stroke="#BDBDBD" strokeWidth="4" strokeLinecap="round" />
                <circle cx="2" cy="15" r="1.5" fill="#333" />
                <circle cx="2" cy="45" r="1.5" fill="#333" />

                {/* Plastic End Cap (Rear) */}
                <rect x="15" y="5" width="15" height="40" rx="3" fill="url(#plasticCap)" />
                {/* Cap Details */}
                <rect x="25" y="10" width="5" height="10" fill="#7F0000" />
                <rect x="25" y="30" width="5" height="10" fill="#7F0000" />

                {/* Metallic Motor Body */}
                <rect x="30" y="5" width="50" height="40" rx="2" fill="url(#metalBody)" />
                {/* Ventilation Slots on Body */}
                <rect x="35" y="12" width="6" height="26" rx="3" fill="#333" />
                <rect x="45" y="12" width="6" height="26" rx="3" fill="#333" />
                
                {/* Front Bearing/Housing */}
                <rect x="80" y="15" width="5" height="20" rx="2" fill="#757575" />

                {/* Output Shaft */}
                <rect x="85" y="22" width="15" height="6" fill="url(#shaftMetal)" />

                {/* Rotating Pinion Gear Indicator (SVG Group to Rotate) */}
                <g style={{
                    transformOrigin: '92px 25px',
                    animation: speed !== 0 ? `spin ${animationDuration} linear infinite ${direction}` : 'none'
                }}>
                    <circle cx="92" cy="25" r="8" fill="#ECEFF1" stroke="#CFD8DC" strokeWidth="1" />
                    {/* Gear Teeth / Cross Indicator for visibility */}
                    <line x1="92" y1="17" x2="92" y2="33" stroke="#90A4AE" strokeWidth="2" />
                    <line x1="84" y1="25" x2="100" y2="25" stroke="#90A4AE" strokeWidth="2" />
                    <circle cx="92" cy="25" r="3" fill="#607D8B" />
                </g>
            </svg>

            <style>
                {`
                    @keyframes spin { 100% { transform: rotate(360deg); } }
                `}
            </style>
        </div>
    );
};
