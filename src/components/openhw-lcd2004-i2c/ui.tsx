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

    return (
        <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h, pointerEvents: 'auto' }}>
            <wokwi-lcd2004
                ref={lcdRef}
                pins="i2c"
                color={attrs?.color || 'blue'}
                style={{ pointerEvents: 'auto', width: '100%', height: '100%' }}
                {...attrs}
            />
        </div>
    );
};
