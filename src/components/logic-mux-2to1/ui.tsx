import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 90, h: 75 };

export const Mux2to1UI = ({ state, attrs }: { state: any, attrs: any }) => {
    const gateColor = '#a855f7';
    const wireColor = '#1e1e1e';

    const nativeW = 90;
    const nativeH = 75;

    return (
        <div style={{
            pointerEvents: 'none',
            width: BOUNDS.w,
            height: BOUNDS.h,
            position: 'relative',
            overflow: 'visible'
        }}>
            <svg
                width={nativeW}
                height={nativeH}
                viewBox="0 0 90 75"
                style={{
                    display: 'block'
                }}
            >
                {/* Input wires — D0, D1 at 15 and 45 */}
                <line x1="0" y1="15" x2="24" y2="15" stroke={wireColor} strokeWidth="3" strokeLinecap="round" />
                <line x1="0" y1="45" x2="24" y2="45" stroke={wireColor} strokeWidth="3" strokeLinecap="round" />

                {/* Select wire — bottom center at 45, 75 */}
                <line x1="45" y1="75" x2="45" y2="60" stroke={wireColor} strokeWidth="3" strokeLinecap="round" />

                {/* Trapezoid body */}
                <defs>
                    <linearGradient id="muxFill" x1="24" y1="5" x2="66" y2="65" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#c084fc" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#a855f7" stopOpacity="0.05" />
                    </linearGradient>
                </defs>
                <polygon
                    points="24,5 66,15 66,55 24,65"
                    fill="url(#muxFill)"
                    stroke={gateColor}
                    strokeWidth="3"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />

                {/* Labels inside */}
                <text x="32" y="19" fill={gateColor} fontSize="10" fontFamily="monospace" fontWeight="bold">0</text>
                <text x="32" y="49" fill={gateColor} fontSize="10" fontFamily="monospace" fontWeight="bold">1</text>

                {/* Output wire at 30 */}
                <line x1="66" y1="35" x2="90" y2="30" stroke={wireColor} strokeWidth="3" strokeLinecap="round" />
            </svg>
        </div>
    );
};

