import React from 'react';

// Tighter bounds to fit the bare board
export const BOUNDS = { x: 0, y: 0, w: 94.5, h: 135 };

export const MPU6050ContextMenu = ({
    attrs,
    onUpdate,
}: {
    attrs: any;
    onUpdate: (key: string, value: any) => void;
}) => (
    <>
        <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 'bold' }}>Accelerometer (g):</span>
        <div style={{ display: 'flex', gap: 4 }}>
            {['accelX', 'accelY', 'accelZ'].map(k => (
                <input key={k} type="number" step="0.1" min="-4" max="4"
                    placeholder={k.replace('accel', '')}
                    value={attrs?.[k] ?? (k === 'accelZ' ? '1' : '0')}
                    onChange={e => onUpdate(k, e.target.value)}
                    style={{ width: 42, background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 4px', outline: 'none', fontSize: 11 }}
                />
            ))}
        </div>
        <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 'bold', marginTop: 4 }}>Gyroscope (°/s):</span>
        <div style={{ display: 'flex', gap: 4 }}>
            {['gyroX', 'gyroY', 'gyroZ'].map(k => (
                <input key={k} type="number" step="1" min="-250" max="250"
                    placeholder={k.replace('gyro', '')}
                    value={attrs?.[k] ?? '0'}
                    onChange={e => onUpdate(k, e.target.value)}
                    style={{ width: 42, background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 4px', outline: 'none', fontSize: 11 }}
                />
            ))}
        </div>
        <span style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>Temperature (°C):</span>
        <input type="number" step="1" min="-40" max="85"
            value={attrs?.temperature ?? '25'}
            onChange={e => onUpdate('temperature', e.target.value)}
            style={{ width: 60, background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 4px', outline: 'none', fontSize: 11 }}
        />
    </>
);

export const MPU6050UI = ({
    state,
    attrs,
}: {
    state: any;
    attrs: any;
}) => {
    const powered = state?.powered ?? false;
    const ax = parseFloat(state?.accelX ?? attrs?.accelX ?? 0).toFixed(1);
    const ay = parseFloat(state?.accelY ?? attrs?.accelY ?? 0).toFixed(1);
    const az = parseFloat(state?.accelZ ?? attrs?.accelZ ?? 1).toFixed(1);
    const gx = parseFloat(state?.gyroX  ?? attrs?.gyroX ?? 0).toFixed(0);
    const gy = parseFloat(state?.gyroY  ?? attrs?.gyroY ?? 0).toFixed(0);
    const gz = parseFloat(state?.gyroZ  ?? attrs?.gyroZ ?? 0).toFixed(0);
    const temp = parseFloat(state?.temperature ?? attrs?.temperature ?? 25).toFixed(1);

    return (
        <div style={{ position: 'relative', width: 94.5, height: 135 }}>
            <svg width="94.5" height="135" viewBox="0 0 94.5 135" style={{ fontFamily: 'sans-serif' }}>
                {/* Main Blue PCB */}
                <rect x="0" y="0" width="94.5" height="135" rx="3" fill="#0d47a1" />
                <rect x="0" y="0" width="94.5" height="135" rx="3" fill="none" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="0.75" />

                {/* Mounting Holes */}
                <circle cx="85.5" cy="10.5" r="3.375" fill="#0f172a" stroke="#d1d5db" strokeWidth="1.125"/>
                <circle cx="85.5" cy="124.5" r="3.375" fill="#0f172a" stroke="#d1d5db" strokeWidth="1.125"/>

                {/* Left Through-Hole Pads (15px pitch) */}
                {[15, 30, 45, 60, 75, 90, 105, 120].map(y => (
                    <circle key={`pin-${y}`} cx="6" cy={y} r="2.625" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.125" />
                ))}

                {/* Left Silkscreen Pin Labels */}
                <g fill="#ffffff" fontSize="6" fontWeight="bold" textAnchor="start">
                    <text x="12" y={15 + 2.25}>VCC</text>
                    <text x="12" y={30 + 2.25}>GND</text>
                    <text x="12" y={45 + 2.25}>SCL</text>
                    <text x="12" y={60 + 2.25}>SDA</text>
                    <text x="12" y={75 + 2.25}>XDA</text>
                    <text x="12" y={90 + 2.25}>XCL</text>
                    <text x="12" y={105 + 2.25}>ADO</text>
                    <text x="12" y={120 + 2.25}>INT</text>
                </g>

                {/* Silkscreen Label ITG/MPU */}
                <text x="90" y="67.5" transform="rotate(-90 90 67.5)" textAnchor="middle" fontSize="6.375" fill="#ffffff" fontWeight="bold" letterSpacing="0.75">ITG/MPU</text>

                {/* XYZ Axis Indicator */}
                <g stroke="#ffffff" strokeWidth="0.75" fill="none">
                    <path d="M 49.5 116.25 L 64.5 116.25 m -3 -2.25 l 3 2.25 l -3 2.25" strokeLinecap="round" strokeLinejoin="round" />
                    <text x="68.25" y="117.75" fill="#ffffff" fontSize="4.5" stroke="none" fontWeight="bold">X</text>
                    <path d="M 49.5 116.25 L 49.5 101.25 m -2.25 3 l 2.25 -3 l 2.25 3" strokeLinecap="round" strokeLinejoin="round" />
                    <text x="48" y="97.5" fill="#ffffff" fontSize="4.5" stroke="none" fontWeight="bold">Y</text>
                    <circle cx="49.5" cy="116.25" r="2.25" />
                    <circle cx="49.5" cy="116.25" r="0.375" fill="#ffffff" stroke="none" />
                </g>

                {/* MPU-6050 Chip */}
                <rect x="28.5" y="52.5" width="27" height="27" rx="1.125" fill="#1e1e1e" />
                <path d="M 27 56.25 v 19.5 m 30 -19.5 v 19.5 m -24.75 -5.25 h 19.5 m -19.5 30 h 19.5" stroke="#888" strokeWidth="1.125" strokeDasharray="0.75, 1.5"/>
                <circle cx="31.5" cy="55.5" r="1.125" fill="#333" />
                <text x="42" y="63.75" textAnchor="middle" fontSize="3" fill="#aaa">INVENSENSE</text>
                <text x="42" y="69" textAnchor="middle" fontSize="3.375" fill="#e2e8f0">MPU-6050</text>

                {/* Capacitor */}
                <rect x="60.75" y="58.5" width="7.5" height="15" rx="0.75" fill="#d4ac0d" />
                <rect x="60.75" y="58.5" width="7.5" height="3" fill="#b7950b" />

                {/* Voltage Regulator */}
                <rect x="40.5" y="18" width="6" height="10.5" fill="#111" />
                <path d="M 39 19.5 v 7.5 m 9 -7.5 v 7.5" stroke="#888" strokeWidth="1.125" strokeDasharray="0.75, 1.875"/>
                <rect x="51" y="19.5" width="3.75" height="7.5" fill="#a8a29e" />
                <rect x="51" y="31.5" width="3.75" height="7.5" fill="#a8a29e" />

                {/* Digital HUD Screen */}
                <rect x="28.5" y="12" width="45" height="30" rx="2.25" fill="#0a0a0a" stroke="#333" strokeWidth="0.75" />
                <circle cx="69" cy="16.5" r="1.875" fill={powered ? '#2ecc71' : '#555'} stroke="#222" strokeWidth="0.375"/>
                
                <text x="31.5" y="19.5" fontSize="3.75" fill="#63b3ed" fontFamily="monospace">A:{ax},{ay},{az}g</text>
                <text x="31.5" y="27" fontSize="3.75" fill="#fc8181" fontFamily="monospace">G:{gx},{gy},{gz}°</text>
                <text x="31.5" y="34.5" fontSize="3.75" fill="#68d391" fontFamily="monospace">T:{temp}°C</text>
            </svg>
        </div>
    );
};
