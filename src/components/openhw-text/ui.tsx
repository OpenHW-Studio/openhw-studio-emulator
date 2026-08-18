import React from 'react';

// Bounding box dynamically adjusts to text length
export const BOUNDS = (attrs: any) => {
    const textContent = attrs?.text || 'Text';
    const fontSize = attrs?.fontSize || 24;
    // Provide a slightly more generous width estimation and minimum size
    // so it's always easy to grab and move, even if text is 1 char or size is tiny.
    const charWidth = fontSize * 0.65; 
    const w = Math.max(30, textContent.length * charWidth);
    const h = Math.max(30, fontSize + 4);
    return { x: 0, y: 0, w, h };
};

export const OpenHWTextUI = ({ state, attrs, isPalette }: { state: any; attrs: any; isPalette?: boolean }) => {
    if (isPalette) {
        return (
            <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                color: 'var(--text, #cbd5e1)',
                fontFamily: 'sans-serif'
            }}>
                <span style={{ fontSize: '24px', fontWeight: 'bold' }}>A|</span>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>Text</span>
            </div>
        );
    }

    const fontSize = attrs?.fontSize !== undefined ? attrs.fontSize : 24;
    const color = attrs?.color || '#ffffff';
    const textContent = attrs?.text || 'Text';
    const b = BOUNDS(attrs);

    return (
        <div style={{ 
            pointerEvents: 'none', 
            width: b.w, 
            height: b.h,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'monospace',
            color: color,
            fontSize: `${fontSize}px`,
            lineHeight: 1,
            whiteSpace: 'nowrap',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
        }}>
            {textContent}
        </div>
    );
};

export const OpenHWTextContextMenu = ({
    attrs,
    onUpdate,
}: {
    attrs: any;
    onUpdate: (key: string, value: any) => void;
}) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text2)' }}>Text:</span>
                <input 
                    type="text" 
                    value={attrs?.text !== undefined ? attrs.text : 'Text'} 
                    onChange={(e) => onUpdate('text', e.target.value)}
                    style={{
                        background: 'var(--bg1)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '12px',
                        width: '100px',
                        outline: 'none'
                    }}
                />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text2)' }}>Color:</span>
                <input 
                    type="color" 
                    value={attrs?.color || '#ffffff'} 
                    onChange={(e) => onUpdate('color', e.target.value)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '0',
                        width: '24px',
                        height: '24px',
                        cursor: 'pointer'
                    }}
                />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text2)' }}>Size:</span>
                <input 
                    type="number" 
                    min="8"
                    max="128"
                    value={attrs?.fontSize !== undefined ? attrs.fontSize : 24} 
                    onChange={(e) => {
                        const val = e.target.value;
                        onUpdate('fontSize', val === '' ? '' : parseInt(val, 10));
                    }}
                    style={{
                        background: 'var(--bg1)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '12px',
                        width: '50px',
                        outline: 'none'
                    }}
                />
            </div>
        </div>
    );
};
