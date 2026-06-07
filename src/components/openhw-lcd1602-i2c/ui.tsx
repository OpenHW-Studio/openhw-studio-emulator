import React, { useEffect, useRef } from 'react';

export const BOUNDS = { x: 0, y: 0, w: 315, h: 135 };

export const Lcd1602I2CUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const lcdRef = useRef<any>(null);

    useEffect(() => {
        if (lcdRef.current && state) {
            // Apply text lines logic for 2 lines, 16 characters each.
            const lines = state.lines || ["", ""];

            lcdRef.current.text =
                (lines[0] || "").padEnd(16, " ") +
                (lines[1] || "").padEnd(16, " ");

            lcdRef.current.backlight = state.illuminated !== false;
        }
    }, [state]);

    const i2cPins = [
        { id: "GND", y: 30 },
        { id: "VCC", y: 45 },
        { id: "SDA", y: 60 },
        { id: "SCL", y: 75 }
    ];

    return (
        <div style={{ 
            position: 'relative', 
            width: BOUNDS.w, 
            height: BOUNDS.h, 
            pointerEvents: 'none'
        }}>
            <wokwi-lcd1602
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
            {/* Custom I2C Pins Overlay */}
            <svg style={{ position: 'absolute', top: 0, left: 0 }} width={BOUNDS.w} height={BOUNDS.h}>
                {/* Backpack visual hint */}
                <rect x="5" y="20" width="20" height="65" fill="#1A1A1A" rx="2" />
                <rect x="10" y="25" width="2" height="55" fill="#E5B85C" />
                {i2cPins.map((pin) => {
                    const cx = 15;
                    const cy = pin.y;
                    return (
                        <g key={pin.id}>
                            <circle cx={cx} cy={cy} r="3" fill="#E5B85C" />
                            <circle cx={cx} cy={cy} r="1.5" fill="#000000" />
                            <text x={cx + 7} y={cy + 2.5} fill="#ffffff" fontSize="6" fontFamily="monospace" fontWeight="bold">
                                {pin.id}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};
