import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 135, h: 130 };

export const SimulationMonitorUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const fps = state?.canvasFps || 60;
    const load = state?.workerCpuLoadPercentage || 2.5;
    const speed = state?.simulationSpeed || 1.0;
    const drift = state?.timeDriftMs || 0;

    return (
        <div style={{
            width: BOUNDS.w,
            height: BOUNDS.h,
            backgroundColor: 'var(--bg2, #1e293b)',
            border: '2px solid var(--border, #334155)',
            borderRadius: 10,
            padding: '10px 12px',
            boxSizing: 'border-box',
            fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--text, #f8fafc)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            userSelect: 'none'
        }}>
            {/* Top Section: Header + Packet Status */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border, #334155)', paddingBottom: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent, #38bdf8)', letterSpacing: '0.05em' }}>SIM MONITOR</div>
                    <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: load > 50 ? '#ef4444' : '#10b981'
                    }} />
                </div>
                <div style={{ fontSize: 9, color: 'var(--text, #0f172a)', textAlign: 'center', margin: '8px 0 0 0', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {state?.telemetryPayloadBytes ? `${state.telemetryPayloadBytes} B / pkt` : 'IDLE (NO TELEMETRY)'}
                </div>
            </div>

            {/* Bottom Section: Metrics List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text2, #64748b)', fontWeight: 600 }}>FPS:</span>
                    <span style={{ color: fps < 30 ? '#ef4444' : '#10b981', fontWeight: 700 }}>{fps}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text2, #64748b)', fontWeight: 600 }}>LOAD:</span>
                    <span style={{ color: load > 50 ? '#ef4444' : 'var(--accent, #0284c7)', fontWeight: 700 }}>{load}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text2, #64748b)', fontWeight: 600 }}>SPEED:</span>
                    <span style={{ color: 'var(--text, #0f172a)', fontWeight: 700 }}>{speed}x</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text2, #64748b)', fontWeight: 600 }}>DRIFT:</span>
                    <span style={{ color: Math.abs(drift) > 50 ? '#ef4444' : 'var(--text, #0f172a)', fontWeight: 700 }}>{drift}ms</span>
                </div>
            </div>
        </div>
    );
};
