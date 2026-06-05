import React, { useEffect, useRef } from 'react';

export const BOUNDS = { x: 0, y: 0, w: 375, h: 225 };

export const Lcd2004I2CUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const lcdRef = useRef<any>(null);

    useEffect(() => {
        if (lcdRef.current && state) {
            // Apply text lines logic for 4 lines, 20 characters each.
            const lines = state.lines || ["", "", "", ""];
            
            lcdRef.current.text = 
                (lines[0] || "").padEnd(20, " ") + 
                (lines[1] || "").padEnd(20, " ") +
                (lines[2] || "").padEnd(20, " ") +
                (lines[3] || "").padEnd(20, " ");
                
            lcdRef.current.backlight = state.illuminated !== false;
        }
    }, [state]);

    const i2cPins = [
        { id: "GND", y: 60 },
        { id: "VCC", y: 75 },
        { id: "SDA", y: 90 },
        { id: "SCL", y: 105 }
    ];

    return (
        <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h, pointerEvents: 'auto' }}>
            <wokwi-lcd2004
                ref={lcdRef}
                pins="none"
                color={attrs?.color || 'blue'}
                style={{ 
                    pointerEvents: 'auto', 
                    width: '100%', 
                    height: '100%',
                    display: 'block'
                }}
                {...attrs}
            />
            {/* Custom I2C Pins Overlay */}
            <svg style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} width={BOUNDS.w} height={BOUNDS.h}>
                {/* Backpack visual hint */}
                <rect x="5" y="50" width="20" height="65" fill="#1A1A1A" rx="2" />
                <rect x="10" y="55" width="2" height="55" fill="#E5B85C" />
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
