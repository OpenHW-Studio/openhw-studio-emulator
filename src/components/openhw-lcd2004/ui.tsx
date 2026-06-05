import React, { useEffect, useRef } from 'react';

export const BOUNDS = { x: 0, y: 0, w: 555, h: 285 };

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

    return (
        <div style={{
            position: 'relative',
            width: BOUNDS.w,
            height: BOUNDS.h,
            pointerEvents: 'none',
            overflow: 'visible'
        }}>
            <wokwi-lcd2004
                ref={lcdRef}
                color={attrs?.color || 'blue'}
                style={{
                    display: 'block',
                    width: 555.4,
                    height: 280.5,
                    transform: 'translate(0.42px, 3.66px)',
                    transformOrigin: '0 0',
                    pointerEvents: 'none'
                }}
                {...attrs}
            />
        </div>
    );
};
