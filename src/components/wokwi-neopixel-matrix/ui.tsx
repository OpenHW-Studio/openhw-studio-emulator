import React, { useRef, useEffect } from 'react';

export const NeopixelContextMenu = ({ attrs, onUpdate }: { attrs: any, onUpdate: (key: string, value: any) => void }) => (
    <>
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>Cols:</span>
        <input
            type="number"
            min="1"
            max="16"
            value={attrs?.cols ?? '8'}
            onChange={e => onUpdate('cols', e.target.value)}
            style={{ width: 40, background: 'var(--bg)', color: 'white', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 4px', outline: 'none' }}
        />
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>Rows:</span>
        <input
            type="number"
            min="1"
            max="16"
            value={attrs?.rows ?? '8'}
            onChange={e => onUpdate('rows', e.target.value)}
            style={{ width: 40, background: 'var(--bg)', color: 'white', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 4px', outline: 'none' }}
        />
    </>
);

// For Neopixels, we really just render the wokwi-neopixel-matrix element.
// In the frontend, the setPixel function is called directly on the DOM element if there's state changes.
export const NeopixelUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const elRef = useRef<HTMLElement>(null);

    // Apply pixel data if provided in state
    useEffect(() => {
        if (state?.pixels && Array.isArray(state.pixels) && elRef.current) {
            const el = elRef.current as any;
            if (typeof el.setPixel === 'function') {
                const cols = parseInt(attrs?.cols || '1', 10);
                state.pixels.forEach((rgb: number, index: number) => {
                    const row = Math.floor(index / cols);
                    const col = index % cols;
                    const r = ((rgb >> 16) & 0xff) / 255;
                    const g = ((rgb >> 8) & 0xff) / 255;
                    const b = (rgb & 0xff) / 255;
                    el.setPixel(row, col, { r, g, b });
                });
            }
        }
    }, [state?.pixels, attrs?.cols]);

    const props = { ...attrs };
    if (props.rows) props.rows = parseInt(props.rows, 10);
    if (props.cols) props.cols = parseInt(props.cols, 10);

    return (
        <div style={{ pointerEvents: 'none' }}>
            {React.createElement('wokwi-neopixel-matrix', {
                ref: elRef,
                ...props
            })}
        </div>
    );
};
