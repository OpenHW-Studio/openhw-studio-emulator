export const BOUNDS = { x: 0, y: 0, w: 70, h: 160 };

import React from 'react';
import moduleImage from './RainDropModule.png';

const W = 97, H = 227;

export const RaindropModuleContextMenu = ({
    attrs, onUpdate,
}: { attrs: any; onUpdate: (key: string, value: any) => void }) => {
    const threshold = attrs?.threshold ?? 300;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>Threshold (0–1023):</span>
            <input type="range" min="0" max="1023" value={threshold}
                onChange={e => onUpdate('threshold', parseInt(e.target.value))}
                style={{ width: 100 }} />
            <span style={{ fontSize: 12, color: 'var(--text)', minWidth: 28 }}>{threshold}</span>
        </div>
    );
};

export const RaindropModuleUI = ({
    state, attrs, isRunning,
}: { state: any; attrs: any; isRunning: boolean }) => {
    const isSidebar = !attrs?.id;
    const rainLevel = typeof state?.rainLevel === 'number' ? state.rainLevel : 0;
    const rainDetected = state?.rainDetected === true;
    const padVoltage = typeof state?.padVoltage === 'number' ? state.padVoltage : 5;
    const threshold = attrs?.threshold ?? 512;

    const doState = rainDetected ? 'LOW' : 'HIGH';
    const aoVoltage = padVoltage.toFixed(2);

    const borderColor = rainDetected ? '#ef4444' : '#22c55e';

    // Sync threshold to logic when attrs change
    React.useEffect(() => {
        if (attrs?.onInteract) {
            attrs.onInteract({ type: 'threshold_update', value: threshold });
        }
    }, [threshold]);

    return (
        <div style={{
            pointerEvents: 'none',
            position: 'absolute',
            inset: 0,
            transform: isSidebar ? 'scale(.7)' : 'none',
            transformOrigin: 'top left'
        }}>
            <div style={{
                position: 'relative', width: W, height: H,
                pointerEvents: 'none',
                borderRadius: 6,
                boxShadow: rainDetected
                    ? '0 0 14px 4px rgba(59,130,246,0.55)'
                    : '0 0 0 0 transparent',
                transition: 'box-shadow 0.2s',
            }}>
                <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}
                    style={{ display: 'block', borderRadius: 6, overflow: 'hidden' }}>
                    <image href={moduleImage} x={0} y={0}
                        width={W} height={H} preserveAspectRatio="xMidYMin meet" />

                    {/* PWR LED */}
                    {isRunning && (
                        <>
                            <circle cx={W * 0.75} cy={H * 0.82} r={3} fill="rgba(34,197,94,0.65)" style={{ filter: 'blur(1.5px)' }} />
                            <circle cx={W * 0.75} cy={H * 0.82} r={2} fill="#22c55e" opacity={0.95} />
                        </>
                    )}

                    {/* DO LED — blue when rain detected */}
                    {rainDetected && (
                        <>
                            <circle cx={W * 0.25} cy={H * 0.82} r={3.5} fill="rgba(59,130,246,0.65)" style={{ filter: 'blur(2px)' }} />
                            <circle cx={W * 0.25} cy={H * 0.82} r={2.5} fill="#3b82f6" opacity={0.95} />
                        </>
                    )}
                </svg>

                {/* Status panel */}
                {isRunning && (
                    <div style={{
                        position: 'absolute', top: H + 10, left: '50%', transform: 'translateX(-50%)',
                        minWidth: 150, background: '#1e1e2e',
                        border: `1.5px solid ${borderColor}`,
                        borderRadius: 8, padding: '6px 10px',
                        color: '#e2e8f0', fontFamily: 'monospace', fontSize: 10,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        zIndex: 50, pointerEvents: 'none', whiteSpace: 'nowrap',
                    }}>
                        {/* Rain detected */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                            <span style={{ color: '#94a3b8' }}>Rain:</span>
                            <span style={{ fontWeight: 'bold', color: rainDetected ? '#3b82f6' : '#22c55e' }}>
                                {rainDetected ? '💧 Detected' : '☀️ Dry'}
                            </span>
                        </div>

                        {/* AO */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            <span style={{ color: '#94a3b8' }}>AO:</span>
                            <span style={{ color: '#a78bfa' }}>{aoVoltage}V</span>
                        </div>

                        {/* Pad Input debug */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            <span style={{ color: '#94a3b8' }}>Pad Input:</span>
                            <span style={{ color: '#60a5fa' }}>{padVoltage.toFixed(2)}V</span>
                        </div>

                        {/* DO */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 2 }}>
                            <span style={{ color: '#94a3b8' }}>DO:</span>
                            <span style={{ color: rainDetected ? '#3b82f6' : '#22c55e' }}>
                                {doState} {rainDetected ? '(0V)' : '(3.3V)'}
                            </span>
                        </div>

                        {/* Rain level bar */}
                        <div style={{ marginTop: 4 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                <span style={{ color: '#94a3b8' }}>Level:</span>
                                <span>{rainLevel} / 1023</span>
                            </div>
                            <div style={{ background: '#2d2d3d', borderRadius: 3, height: 5 }}>
                                <div style={{
                                    height: '100%', borderRadius: 3,
                                    width: `${(rainLevel / 1023) * 100}%`,
                                    background: rainDetected
                                        ? 'linear-gradient(90deg,#3b82f6,#06b6d4)'
                                        : 'linear-gradient(90deg,#22c55e,#86efac)',
                                    transition: 'width 0.3s ease',
                                }} />
                            </div>
                        </div>

                        {/* Threshold */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                            <span style={{ color: '#94a3b8' }}>Threshold:</span>
                            <span style={{ color: '#fbbf24' }}>{threshold}</span>
                        </div>

                        {/* DO note */}
                        <div style={{ marginTop: 4, textAlign: 'center', color: '#64748b', fontSize: 9 }}>
                            ⚠ DO is active LOW (0V = rain)
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
