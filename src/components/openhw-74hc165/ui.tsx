import * as React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 135, h: 45 };

export const HC165UI = (props: any) => {
    const { rotation } = props;
    const w = BOUNDS.w;
    const h = BOUNDS.h;

    // DIP pins x coords: 15, 30, 45, 60, 75, 90, 105, 120
    const pinsX = [15, 30, 45, 60, 75, 90, 105, 120];

    return (
        <div style={{
            pointerEvents: 'none',
            width: w,
            height: h,
            position: 'relative',
            transform: `rotate(${rotation || 0}deg)`
        }}>
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg">
                <g>
                    {/* Top Pins */}
                    {pinsX.map((x, i) => (
                        <rect key={`t-${i}`} x={x - 4} y="0" width="8" height="6" fill="#cccccc" />
                    ))}
                    {/* Bottom Pins */}
                    {pinsX.map((x, i) => (
                        <rect key={`b-${i}`} x={x - 4} y={h - 6} width="8" height="6" fill="#cccccc" />
                    ))}

                    {/* IC Body */}
                    <rect x="0" y="4" width={w} height={h - 8} fill="#222222" />

                    {/* Notch */}
                    <path d="M 0 16 A 6 6 0 0 0 0 28" fill="#111111" />

                    {/* Pin 1 Dot */}
                    <circle cx="9" cy="35" r="3.5" fill="#444444" />

                    {/* Text */}
                    <text x={w / 2} y={h / 2 - 2} fill="#999900" fontSize="14" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">74HC</text>
                    <text x={w / 2} y={h / 2 + 12} fill="#999900" fontSize="14" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">165</text>
                </g>
            </svg>
        </div>
    );
};
