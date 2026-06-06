import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 75, h: 60 };

export const NandGateUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const gateColor = '#a855f7';
    const wireColor = '#1e1e1e';

    return (
        <svg width="75" height="60" viewBox="0 0 75 60" style={{ pointerEvents: 'none' }}>
            {/* Input wires */}
            <line x1="0" y1="15" x2="20" y2="15" stroke={wireColor} strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="45" x2="20" y2="45" stroke={wireColor} strokeWidth="2" strokeLinecap="round" />

            {/* D-shape body */}
            <defs>
                <linearGradient id="nandGateFill" x1="20" y1="10" x2="55" y2="30" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#c084fc" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0.05" />
                </linearGradient>
            </defs>
            <path
                d="M 20 10 L 40 10 A 20 20 0 0 1 40 50 L 20 50 Z"
                fill="url(#nandGateFill)"
                stroke={gateColor}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
            />

            {/* Inversion Circle */}
            <circle cx="63" cy="30" r="3" fill="transparent" stroke={gateColor} strokeWidth="2" />

            {/* Output wire */}
            <line x1="66" y1="30" x2="75" y2="30" stroke={wireColor} strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
};
