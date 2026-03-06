import React from 'react';

export const PowerSupplyContextMenu = ({ attrs, onUpdate }: { attrs: any, onUpdate: (key: string, value: any) => void }) => (
    <>
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>Voltage:</span>
        <input
            type="number"
            step="0.1"
            value={attrs?.voltage ?? '5.0'}
            onChange={e => onUpdate('voltage', e.target.value)}
            style={{ width: 50, background: 'var(--bg)', color: 'white', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 4px', outline: 'none' }}
        />
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>V</span>
    </>
);

export const PowerSupplyUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const voltage = attrs?.voltage || '5.0';
    return (
        <div style={{ position: 'relative', width: 60, height: 60, background: '#2c3e50', borderRadius: 8, border: '2px solid #34495e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-around', color: 'white', fontFamily: 'monospace' }}>
            <div style={{ fontSize: 10, fontWeight: 'bold' }}>POWER</div>
            <div style={{ fontSize: 12, color: '#e74c3c', marginTop: 4 }}>{voltage}V</div>
            <div style={{ fontSize: 12, color: '#95a5a6', marginBottom: 4 }}>GND</div>

            {/* Visual pins matching manifest locations roughly */}
            <div style={{ position: 'absolute', right: -5, top: 12, width: 10, height: 6, background: '#bdc3c7', borderRadius: 2 }} />
            <div style={{ position: 'absolute', right: -5, top: 42, width: 10, height: 6, background: '#bdc3c7', borderRadius: 2 }} />
        </div>
    );
};
