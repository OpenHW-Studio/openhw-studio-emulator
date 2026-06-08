import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 105, h: 90 };

export const DFlipFlopUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const gateColor = '#a855f7';
    const wireColor = '#1e1e1e';

    return (
        <svg width="105" height="90" viewBox="0 0 105 90" style={{ pointerEvents: 'none' }}>
            {/* Input wires — D and CLK */}
            <line x1="0" y1="30" x2="20" y2="30" stroke={wireColor} strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="60" x2="20" y2="60" stroke={wireColor} strokeWidth="2" strokeLinecap="round" />

            {/* Rectangular body */}
            <defs>
                <linearGradient id="dffFill" x1="20" y1="10" x2="85" y2="80" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#c084fc" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0.05" />
                </linearGradient>
            </defs>
            <rect
                x="20" y="10" width="65" height="70" rx="4"
                fill="url(#dffFill)"
                stroke={gateColor}
                strokeWidth="2"
            />

            {/* D label */}
            <text x="30" y="34" fill={gateColor} fontSize="12" fontFamily="monospace" fontWeight="bold">D</text>

            {/* Clock triangle */}
            <polygon points="20,54 30,60 20,66" fill="none" stroke={gateColor} strokeWidth="2" strokeLinejoin="round" />

            {/* Large D in center */}
            <text x="52.5" y="55" fill={gateColor} fontSize="24" fontFamily="monospace" fontWeight="bold" opacity="0.4" textAnchor="middle">D</text>

            {/* Q label */}
            <text x="75" y="34" fill={gateColor} fontSize="12" fontFamily="monospace" fontWeight="bold" textAnchor="end">Q</text>

            {/* Qbar label — Q with overline */}
            <text x="75" y="64" fill={gateColor} fontSize="12" fontFamily="monospace" fontWeight="bold" textAnchor="end">Q</text>
            <line x1="66" y1="54" x2="76" y2="54" stroke={gateColor} strokeWidth="2" />

            {/* Output wires — Q and Qbar */}
            <line x1="85" y1="30" x2="105" y2="30" stroke={wireColor} strokeWidth="2" strokeLinecap="round" />
            <line x1="85" y1="60" x2="105" y2="60" stroke={wireColor} strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
};
