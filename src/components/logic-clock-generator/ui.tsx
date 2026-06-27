import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 75, h: 60 };

export const ClockGeneratorUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const componentColor = '#9c27b0';
    const wireColor = '#1e1e1e';
    
    let freq = attrs?.frequency || '10';
    let units = attrs?.units || 'KHz';
    const dispTxt = `${freq}${units.replace('Hz', '').toLowerCase()}`;

    return (
        <svg width="75" height="60" viewBox="0 0 75 60" style={{ pointerEvents: 'none' }}>
            <rect
                x="5" y="5" width="50" height="50"
                fill="#e0e0e0"
                fillOpacity="0.4"
                stroke={componentColor}
                strokeWidth="2"
                rx="4"
            />
            <path
                d="M 10 40 L 20 40 L 20 20 L 35 20 L 35 40 L 50 40"
                fill="none"
                stroke={componentColor}
                strokeWidth="2"
                strokeLinejoin="miter"
            />
            <text x="30" y="52" fill="#000" fontSize="10" fontFamily="sans-serif" textAnchor="middle">
                {dispTxt}
            </text>
            <line x1="55" y1="30" x2="75" y2="30" stroke={wireColor} strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
};


export const ClockGeneratorContextMenu = ({ attrs, onUpdate }: { attrs: any, onUpdate: (k: string, v: any) => void }) => {
    return (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '0 4px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)' }}>Frequency</span>
                <input
                    type="number"
                    min="1"
                    max="999"
                    value={attrs.frequency || 10}
                    onChange={e => onUpdate('frequency', e.target.value)}
                    style={{
                        width: 60, height: 26, background: 'var(--bg3)', border: '1px solid var(--border)',
                        color: 'var(--text)', borderRadius: 4, padding: '0 6px', fontSize: 12, outline: 'none'
                    }}
                />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)' }}>Units</span>
                <select
                    value={attrs.units || 'KHz'}
                    onChange={e => onUpdate('units', e.target.value)}
                    style={{
                        height: 26, background: 'var(--bg3)', border: '1px solid var(--border)',
                        color: 'var(--text)', borderRadius: 4, padding: '0 6px', fontSize: 12, outline: 'none'
                    }}
                >
                    <option value="Hz">Hz</option>
                    <option value="KHz">KHz</option>
                    <option value="MHz">MHz</option>
                </select>
            </div>
        </div>
    );
};
