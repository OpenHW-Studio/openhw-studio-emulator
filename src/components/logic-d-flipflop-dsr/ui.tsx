import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 120, h: 90 };

export const DFlipFlopDsrUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const gateColor = '#a855f7';
    const wireColor = '#1e1e1e';

    return (
        <svg width="120" height="90" viewBox="0 0 120 90" style={{ pointerEvents: 'none' }}>
            {/* Input wires — D (top-left) and CLK (bottom-left) */}
            <line x1="0" y1="30" x2="20" y2="30" stroke={wireColor} strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="60" x2="20" y2="60" stroke={wireColor} strokeWidth="2" strokeLinecap="round" />

            {/* Set wire (top-center) */}
            <line x1="60" y1="0" x2="60" y2="10" stroke={wireColor} strokeWidth="2" strokeLinecap="round" />

            {/* Reset wire (bottom-center) */}
            <line x1="60" y1="90" x2="60" y2="80" stroke={wireColor} strokeWidth="2" strokeLinecap="round" />

            {/* Rectangular body */}
            <defs>
                <linearGradient id="dffdsrFill" x1="20" y1="10" x2="100" y2="80" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#c084fc" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0.05" />
                </linearGradient>
            </defs>
            <rect
                x="20" y="10" width="80" height="70" rx="4"
                fill="url(#dffdsrFill)"
                stroke={gateColor}
                strokeWidth="2"
            />

            {/* Labels inside */}
            <text x="30" y="34" fill={gateColor} fontSize="12" fontFamily="monospace" fontWeight="bold">D</text>

            {/* Clock triangle */}
            <polygon points="20,54 30,60 20,66" fill="none" stroke={gateColor} strokeWidth="2" strokeLinejoin="round" />

            {/* Set label */}
            <text x="56" y="24" fill={gateColor} fontSize="12" fontFamily="monospace" fontWeight="bold">S</text>

            {/* Reset label */}
            <text x="56" y="74" fill={gateColor} fontSize="12" fontFamily="monospace" fontWeight="bold">R</text>

            {/* Q label */}
            <text x="90" y="34" fill={gateColor} fontSize="12" fontFamily="monospace" fontWeight="bold" textAnchor="end">Q</text>

            {/* Qbar label — Q with overline */}
            <text x="90" y="64" fill={gateColor} fontSize="12" fontFamily="monospace" fontWeight="bold" textAnchor="end">Q</text>
            <line x1="81" y1="54" x2="91" y2="54" stroke={gateColor} strokeWidth="2" />

            {/* Output wires — Q and Qbar */}
            <line x1="100" y1="30" x2="120" y2="30" stroke={wireColor} strokeWidth="2" strokeLinecap="round" />
            <line x1="100" y1="60" x2="120" y2="60" stroke={wireColor} strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
};
