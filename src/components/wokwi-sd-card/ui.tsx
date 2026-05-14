// @ts-nocheck
import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 152, h: 101.3 };

export const SDCardUI = ({ state }: { state: any }) => {
    const powered = !!state?.powered;
    const mounted = state?.mounted !== false;
    const active = !!state?.activity;
    const backend = String(state?.backend || 'memory');
    const fileCount = Number(state?.fileCount || 0);
    const usedBytes = Number(state?.usedBytes || 0);
    const capacityKB = Number(state?.capacityKB || 0);
    const lastOp = String(state?.lastOp || 'idle');

    const shellBg = mounted ? '#1f2937' : '#374151';
    const edge = mounted ? '#0f172a' : '#6b7280';
    const led = !powered ? '#111827' : (active ? '#22c55e' : '#334155');
    const usageLabel = capacityKB > 0
        ? `${Math.max(0, usedBytes / 1024).toFixed(1)}/${capacityKB}KB`
        : `${usedBytes}B`;

    const nativeW = 80;
    const nativeH = 58;
    const scaleX = BOUNDS.w / nativeW;
    const scaleY = BOUNDS.h / nativeH;

    return (
        <div style={{
            width: BOUNDS.w,
            height: BOUNDS.h,
            pointerEvents: 'none',
            position: 'relative'
        }}>
            <div
                style={{
                    width: nativeW,
                    height: nativeH,
                    borderRadius: 8,
                    border: `2px solid ${edge}`,
                    background: shellBg,
                    color: '#e5e7eb',
                    fontFamily: 'monospace',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    boxSizing: 'border-box',
                    opacity: mounted ? 1 : 0.65,
                    transform: `scale(${scaleX}, ${scaleY})`,
                    transformOrigin: '0 0'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 700 }}>microSD</span>
                    <span
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            background: led,
                            boxShadow: active ? '0 0 8px rgba(34,197,94,0.8)' : 'none',
                        }}
                    />
                </div>
                <div style={{ fontSize: 8, color: '#93c5fd' }}>{backend}</div>
                <div style={{ fontSize: 8, color: '#94a3b8' }}>
                    {fileCount} files • {usageLabel}
                </div>
                <div style={{ fontSize: 8, color: mounted ? '#cbd5e1' : '#fca5a5' }}>
                    {mounted ? `mounted • ${lastOp}` : 'ejected'}
                </div>
            </div>
        </div>
    );
};
