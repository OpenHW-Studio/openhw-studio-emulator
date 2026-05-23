import React, { useRef, useEffect } from 'react';

// Bounding box for the blue selection ring.
export const BOUNDS = (attrs: any) => {
    const cols = parseInt(attrs?.cols || '1', 10);
    const rows = parseInt(attrs?.rows || '1', 10);
    return {
        x: 0,
        y: 0,
        w: cols * 30,
        h: rows * 30
    };
};

export const NeopixelUI = ({ state, attrs, comp }: { state: any, attrs: any, comp?: any }) => {
    const elRef = useRef<HTMLElement>(null);
    const cols = parseInt(attrs?.cols || '8', 10);
    const rows = parseInt(attrs?.rows || '8', 10);

    const targetW = cols * 30;
    const targetH = rows * 30;

    const nativeW = cols * 25.4; // Native Wokwi matrix cell pitch is ~25.4px (0.1 inch)
    const nativeH = rows * 25.4;
    const scaleX = targetW / nativeW;
    const scaleY = targetH / nativeH;

    // Apply pixel data if provided in state
    useEffect(() => {
        if (state?.pixels && Array.isArray(state.pixels) && elRef.current) {
            const el = elRef.current as any;
            if (typeof el.setPixel === 'function') {
                state.pixels.forEach((rgb: number, index: number) => {
                    const r_idx = Math.floor(index / cols);
                    const c_idx = index % cols;
                    const r = (rgb >> 16) & 0xff;
                    const g = (rgb >> 8) & 0xff;
                    const b = rgb & 0xff;
                    el.setPixel(r_idx, c_idx, { r, g, b });
                });
            }
        }
    }, [state?.pixels, cols, rows]);

    const props = { ...attrs };
    if (props.rows) props.rows = parseInt(props.rows, 10);
    if (props.cols) props.cols = parseInt(props.cols, 10);

    return (
        <div style={{ 
            pointerEvents: 'none',
            width: targetW,
            height: targetH,
            position: 'relative'
        }}>
            {React.createElement('wokwi-neopixel-matrix', {
                ref: elRef,
                ...props,
                style: {
                    display: 'block',
                    width: nativeW,
                    height: nativeH,
                    transform: `scale(${scaleX}, ${scaleY})`,
                    transformOrigin: '0 0'
                }
            })}
        </div>
    );
};
