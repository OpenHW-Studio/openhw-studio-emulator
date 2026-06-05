import React, { useEffect, useRef } from 'react';

export const BOUNDS = { x: 0, y: 0, w: 360, h: 195 };

export const Lcd2004UI = ({ state, attrs }: { state: any, attrs: any }) => {
    const lcdRef = useRef<any>(null);

    useEffect(() => {
        if (lcdRef.current && state) {
            const lines = state.lines || ["", "", "", ""];
            lcdRef.current.text =
                (lines[0] || "").padEnd(20, " ") +
                (lines[1] || "").padEnd(20, " ") +
                (lines[2] || "").padEnd(20, " ") +
                (lines[3] || "").padEnd(20, " ");
            lcdRef.current.backlight = state.illuminated !== false;
        }
    }, [state]);

    const pinLabels = ["VSS", "VDD", "V0", "RS", "RW", "E", "D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "A", "K"];

    return (
        <div style={{
            position: 'relative',
            width: BOUNDS.w,
            height: BOUNDS.h,
            pointerEvents: 'none'
        }}>
            <wokwi-lcd2004
                ref={lcdRef}
                pins="none"
                color={attrs?.color || 'blue'}
                style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none'
                }}
                {...attrs}
            />
            {/* Custom SVG Pins Overlay */}
            <svg style={{ position: 'absolute', top: 0, left: 0 }} width={BOUNDS.w} height={BOUNDS.h}>
                {pinLabels.map((id, index) => {
                    const cx = 45 + index * 15;
                    const cy = 15;
                    return (
                        <g key={id}>
                            {/* Pin hole graphic */}
                            <circle cx={cx} cy={cy} r="4" fill="#92926d" />
                            <circle cx={cx} cy={cy} r="2" fill="#000000" />
                            {/* Label */}
                            <text x={cx} y={cy - 6} fill="#ffffff" fontSize="7" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                                {id}
                            </text>
                            {/* Pin index */}
                            {index === 0 && <text x={cx - 10} y={cy + 3} fill="#ffffff" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="bold">1</text>}
                            {index === 15 && <text x={cx + 12} y={cy + 3} fill="#ffffff" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="bold">16</text>}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};
