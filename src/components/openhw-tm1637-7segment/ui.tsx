import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 200, h: 100 };

export const WokwiTM1637UI = ({ state, attrs }: { state: any, attrs: any }) => {
    // Parse attributes
    const activeColor = attrs?.color || 'red';
    const offColor = '#222222';

    // TM1637 handles 4 digits internally
    const numDigits = 4;
    const hasColon = true;

    // Geometry layout for native SVG segments
    const digitSpacing = 60; // 50 width + 10 gap
    const colonWidth = 20;

    const displayOn = state?.displayOn !== false;

    const getFill = (digitIndex: number, bitMode: number) => {
        if (!displayOn) return offColor;
        const val = state?.digits?.[digitIndex] || 0;
        return (val & bitMode) ? activeColor : offColor;
    };

    return (
        <div style={{
            width: BOUNDS.w,
            height: BOUNDS.h,
            pointerEvents: 'none',
            position: 'relative'
        }}>
            <svg
                width={BOUNDS.w}
                height={BOUNDS.h}
                viewBox={`0 0 ${BOUNDS.w} ${BOUNDS.h}`}
                style={{ display: 'block' }}
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* PCB Board */}
                <rect width={BOUNDS.w} height={BOUNDS.h} rx={4} fill="#23467A" />

                {/* Mounting Holes */}
                <circle cx="10" cy="10" r="4" fill="#E0E0E0" />
                <circle cx="190" cy="10" r="4" fill="#E0E0E0" />
                <circle cx="10" cy="90" r="4" fill="#E0E0E0" />
                <circle cx="190" cy="90" r="4" fill="#E0E0E0" />

                {/* Black Display Area */}
                <rect x="25" y="20" width="130" height="50" fill="#000000" />

                {/* Header Block and Pins */}
                <g transform="translate(165, 30)">
                    <rect x="0" y="0" width="10" height="40" fill="#151515" stroke="#555" strokeWidth="1" />
                    {/* Silver pins protruding to the right edge */}
                    <rect x="10" y="4" width="25" height="2" fill="#B0B0B0" />
                    <rect x="10" y="14" width="25" height="2" fill="#B0B0B0" />
                    <rect x="10" y="24" width="25" height="2" fill="#B0B0B0" />
                    <rect x="10" y="34" width="25" height="2" fill="#B0B0B0" />
                    {/* Header holes */}
                    <rect x="3" y="3" width="4" height="4" fill="#333" />
                    <rect x="3" y="13" width="4" height="4" fill="#333" />
                    <rect x="3" y="23" width="4" height="4" fill="#333" />
                    <rect x="3" y="33" width="4" height="4" fill="#333" />
                </g>

                {/* Board Label */}
                <text x="90" y="85" fill="#FFFFFF" fontSize="12" fontFamily="sans-serif" textAnchor="middle">4-Digit Display</text>

                {/* Render Digits inside black box */}
                <g transform="translate(30, 25) scale(0.46, 0.57)">
                    {Array.from({ length: numDigits }).map((_, i) => {
                        const isAfterColon = i >= 2;
                        const xOffset = (i * digitSpacing) + (isAfterColon ? colonWidth : 0);

                        return (
                            <g key={i} transform={`translate(${xOffset}, 0)`}>
                                <polygon points="12,10 38,10 34,14 16,14" fill={getFill(i, 0x01 /* A */)} />
                                <polygon points="40,12 40,33 36,29 36,16" fill={getFill(i, 0x02 /* B */)} />
                                <polygon points="40,37 40,58 36,54 36,41" fill={getFill(i, 0x04 /* C */)} />
                                <polygon points="12,60 38,60 34,56 16,56" fill={getFill(i, 0x08 /* D */)} />
                                <polygon points="10,37 10,58 14,54 14,41" fill={getFill(i, 0x10 /* E */)} />
                                <polygon points="10,12 10,33 14,29 14,16" fill={getFill(i, 0x20 /* F */)} />
                                <polygon points="12,35 16,33 34,33 38,35 34,37 16,37" fill={getFill(i, 0x40 /* G */)} />
                                {/* Decimal point */}
                                <circle cx="44" cy="60" r="3" fill={getFill(i, 0x80 /* DP */)} />
                            </g>
                        );
                    })}

                    {/* Render Colon */}
                    {hasColon && (
                        <g transform={`translate(${2 * digitSpacing}, 0)`}>
                            <circle cx="10" cy="25" r="4" fill={displayOn && state?.colon ? activeColor : offColor} />
                            <circle cx="10" cy="45" r="4" fill={displayOn && state?.colon ? activeColor : offColor} />
                        </g>
                    )}
                </g>
            </svg>
        </div>
    );
};
