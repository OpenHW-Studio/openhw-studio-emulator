import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 90, h: 90 };

export const DFlipFlopRUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const gateColor = '#a855f7';
    const wireColor = '#1e1e1e';

    return (
        <svg width="90" height="90" viewBox="0 0 90 90" style={{ pointerEvents: 'none' }}>
            {/* Input wires — D (top-left) and CLK (bottom-left) */}
            <line x1="0" y1="30" x2="18" y2="30" stroke={wireColor} strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="60" x2="18" y2="60" stroke={wireColor} strokeWidth="2" strokeLinecap="round" />

            {/* Reset wire (bottom-center) */}
            <line x1="45" y1="90" x2="45" y2="80" stroke={wireColor} strokeWidth="2" strokeLinecap="round" />

            {/* Rectangular body */}
            <defs>
                <linearGradient id="dffrFill" x1="18" y1="10" x2="72" y2="80" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#c084fc" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0.05" />
                </linearGradient>
            </defs>
            <rect
                x="18" y="10" width="54" height="70" rx="4"
                fill="url(#dffrFill)"
                stroke={gateColor}
                strokeWidth="2"
            />

            {/* Labels inside */}
            <text x="24" y="34" fill={gateColor} fontSize="12" fontFamily="monospace" fontWeight="bold">D</text>

            {/* Clock triangle */}
            <polygon points="18,54 28,60 18,66" fill="none" stroke={gateColor} strokeWidth="2" strokeLinejoin="round" />

            {/* Reset label */}
            <text x="41" y="76" fill={gateColor} fontSize="12" fontFamily="monospace" fontWeight="bold">R</text>

            {/* Q label */}
            <text x="68" y="34" fill={gateColor} fontSize="12" fontFamily="monospace" fontWeight="bold" textAnchor="end">Q</text>

            {/* Qbar label — Q with overline */}
            <text x="68" y="64" fill={gateColor} fontSize="12" fontFamily="monospace" fontWeight="bold" textAnchor="end">Q</text>
            <line x1="59" y1="54" x2="69" y2="54" stroke={gateColor} strokeWidth="2" />

            {/* Output wires — Q and Qbar */}
            <line x1="72" y1="30" x2="90" y2="30" stroke={wireColor} strokeWidth="2" strokeLinecap="round" />
            <line x1="72" y1="60" x2="90" y2="60" stroke={wireColor} strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
};
