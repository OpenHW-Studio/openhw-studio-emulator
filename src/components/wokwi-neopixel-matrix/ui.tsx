import React, { useRef, useEffect } from 'react';

const spinBtn: React.CSSProperties = {
    width: 20, height: 20, border: '1px solid var(--border)', borderRadius: 4,
    background: 'var(--bg2)', color: 'var(--text)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, lineHeight: 1, padding: 0, flexShrink: 0,
};

const numDisplay: React.CSSProperties = {
    minWidth: 22, textAlign: 'center', fontSize: 12,
    color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace',
};

export const NeopixelContextMenu = ({ attrs, onUpdate }: { attrs: any, onUpdate: (key: string, value: any) => void }) => {
    const cols = Math.max(1, Math.min(16, parseInt(attrs?.cols ?? '8', 10)));
    const rows = Math.max(1, Math.min(16, parseInt(attrs?.rows ?? '8', 10)));
    return (
        <>
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>Cols:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <button style={spinBtn} onClick={() => onUpdate('cols', Math.max(1, cols - 1))}>−</button>
                <span style={numDisplay}>{cols}</span>
                <button style={spinBtn} onClick={() => onUpdate('cols', Math.min(16, cols + 1))}>+</button>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>Rows:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <button style={spinBtn} onClick={() => onUpdate('rows', Math.max(1, rows - 1))}>−</button>
                <span style={numDisplay}>{rows}</span>
                <button style={spinBtn} onClick={() => onUpdate('rows', Math.min(16, rows + 1))}>+</button>
            </div>
        </>
    );
};

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
