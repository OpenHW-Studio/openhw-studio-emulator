import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 603, h: 295 };

export const MegaUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const nativeW = 430;
    const nativeH = 228;
    const scaleX = 1.5544;
    const scaleY = 1.5544;

    return (
        <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h, overflow: 'visible' }}>
            <div style={{ width: nativeW, height: nativeH, transform: `scale(${scaleX}, ${scaleY})`, transformOrigin: '0 0', position: 'relative' }}>
                {React.createElement('wokwi-arduino-mega', {
                    style: { pointerEvents: 'none', width: '100%', height: '100%' },
                    ...attrs
                })}
            </div>
        </div>
    );
};
