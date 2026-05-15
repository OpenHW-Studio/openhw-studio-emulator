import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 105.9, h: 94.1 };

export const DFlipFlopUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const gateColor = '#a855f7';
    const wireColor = '#1e1e1e';

    const nativeW = 90;
    const nativeH = 80;
    const scaleX = BOUNDS.w / nativeW;
    const scaleY = BOUNDS.h / nativeH;

    return (
        <div style={{
            pointerEvents: 'none',
            width: BOUNDS.w,
            height: BOUNDS.h,
            position: 'relative'
        }}>
            <svg
                width={nativeW}
                height={nativeH}
                viewBox="0 0 90 80"
                style={{
                    display: 'block',
                    transform: `scale(${scaleX}, ${scaleY})`,
                    transformOrigin: '0 0'
                }}
            >
                {/* Input wires — D and CLK */}
                <line x1="0" y1="22" x2="18" y2="22" stroke={wireColor} strokeWidth="3" strokeLinecap="round" />
                <line x1="0" y1="58" x2="18" y2="58" stroke={wireColor} strokeWidth="3" strokeLinecap="round" />

                {/* Rectangular body */}
                <defs>
                    <linearGradient id="dffFill" x1="18" y1="6" x2="72" y2="74" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#c084fc" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#a855f7" stopOpacity="0.05" />
                    </linearGradient>
                </defs>
                <rect
                    x="18" y="6" width="54" height="68" rx="3"
                    fill="url(#dffFill)"
                    stroke={gateColor}
                    strokeWidth="3"
                />

                {/* D label */}
                <text x="24" y="27" fill={gateColor} fontSize="12" fontFamily="monospace" fontWeight="bold">D</text>

                {/* Clock triangle */}
                <polygon points="18,52 28,58 18,64" fill="none" stroke={gateColor} strokeWidth="2" strokeLinejoin="round" />

                {/* Large D in center */}
                <text x="36" y="50" fill={gateColor} fontSize="24" fontFamily="monospace" fontWeight="bold" opacity="0.4">D</text>

                {/* Q label */}
                <text x="58" y="27" fill={gateColor} fontSize="12" fontFamily="monospace" fontWeight="bold">Q</text>

                {/* Qbar label — Q with overline */}
                <text x="58" y="64" fill={gateColor} fontSize="12" fontFamily="monospace" fontWeight="bold">Q</text>
                <line x1="58" y1="55" x2="68" y2="55" stroke={gateColor} strokeWidth="2" />

                {/* Output wires — Q and Qbar */}
                <line x1="72" y1="22" x2="90" y2="22" stroke={wireColor} strokeWidth="3" strokeLinecap="round" />
                <line x1="72" y1="58" x2="90" y2="58" stroke={wireColor} strokeWidth="3" strokeLinecap="round" />
            </svg>
        </div>
    );
};
