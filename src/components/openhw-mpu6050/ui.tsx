import React from 'react';

// BOUNDS set to encompass the scaled component so pins land cleanly on grid
export const BOUNDS = { x: 0, y: 0, w: 135, h: 105 };

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

    // Scale from 9.6px internal pitch to 15px external pitch
    const S = 15 / 9.6; // 1.5625
    // Translate so the first pin (INT at x=7.28, y=5.78) lands perfectly at (15, 15)
    const TX = 15 - (7.28 * S); // 3.625
    const TY = 15 - (5.78 * S); // 5.96875

    return (
        <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h }}>
            <svg
                width="100%"
                height="100%"
                clipRule="evenodd"
                fillRule="evenodd"
                version="1.1"
                viewBox={`0 0 ${BOUNDS.w} ${BOUNDS.h}`}
                xmlns="http://www.w3.org/2000/svg"
                style={{ overflow: 'visible' }}
            >
                <defs>
                    <pattern id={`pin-pattern-${state?.id || 'default'}`} height="2.1" width="14" patternUnits="userSpaceOnUse">
                        <path
                            d=" m2.09 1.32c0.124 0 0.243-0.049 0.331-0.137 0.086-0.086 0.137-0.206 0.137-0.33v-0.387c0-0.124-0.050-0.242-0.137-0.33-0.087-0.087-0.207-0.137-0.331-0.137h-1.62v1.32z"
                            fill="#f5f9f0"
                        />
                    </pattern>
                </defs>

                <g transform={`translate(${TX}, ${TY}) scale(${S})`}>
                    {/* Board */}
                    <path
                        d="m81.6 0h-81.6v61.2h81.6zm-10 44.9c3.8 0 6.88 3.08 6.88 6.88 0 3.8-3.08 6.89-6.88 6.89-3.8 0-6.89-3.09-6.89-6.89 0-3.8 3.09-6.88 6.89-6.88zm-61.6 0c3.8 0 6.89 3.08 6.89 6.88 0 3.8-3.09 6.89-6.89 6.89-3.8 0-6.88-3.09-6.88-6.89 0-3.8 3.08-6.88 6.88-6.88zm-2.74-41.9c1.55 0 2.81 1.26 2.81 2.81s-1.26 2.8-2.81 2.8-2.8-1.26-2.8-2.8 1.26-2.81 2.8-2.81zm19.2 0c1.55 0 2.81 1.26 2.81 2.81s-1.26 2.8-2.81 2.8c-1.55 0-2.8-1.26-2.8-2.8s1.26-2.81 2.8-2.81zm-9.58 0c1.55 0 2.81 1.26 2.81 2.81s-1.26 2.8-2.81 2.8c-1.55 0-2.8-1.26-2.8-2.8s1.26-2.81 2.8-2.81zm19.2 0c1.55 0 2.81 1.26 2.81 2.81s-1.26 2.8-2.81 2.8c-1.55 0-2.8-1.26-2.8-2.8s1.26-2.81 2.8-2.81zm9.58 0c1.55 0 2.8 1.26 2.8 2.81s-1.26 2.8-2.8 2.8c-1.55 0-2.81-1.26-2.81-2.8s1.26-2.81 2.81-2.81zm19.2 0c1.55 0 2.8 1.26 2.8 2.81s-1.26 2.8-2.8 2.8-2.81-1.26-2.81-2.8 1.26-2.81 2.81-2.81zm-9.58 0c1.55 0 2.8 1.26 2.8 2.81s-1.26 2.8-2.8 2.8c-1.55 0-2.81-1.26-2.81-2.8s1.26-2.81 2.81-2.81zm19.2 0c1.55 0 2.8 1.26 2.8 2.81s-1.26 2.8-2.8 2.8c-1.55 0-2.81-1.26-2.81-2.8s1.26-2.81 2.81-2.81z"
                        fill="#16619d"
                    />

                    {/* Right Chip */}
                    <g fill="#fefdf4">
                        <rect x="74.5" y="23.1" width="2.01" height="4.81" />
                        <rect x="67.8" y="33" width="2.01" height="4.81" />
                        <rect x="71.2" y="23.1" width="2.01" height="4.81" />
                        <rect x="67.8" y="23.1" width="2.01" height="4.81" />
                        <rect x="74.5" y="33" width="2.01" height="4.81" />
                    </g>
                    <g fill="#31322e">
                        <rect x="74.5" y="25.5" width="2.01" height="2.4" />
                        <rect x="67.8" y="33" width="2.01" height="2.4" />
                        <rect x="71.2" y="25.5" width="2.01" height="2.4" />
                        <rect x="67.8" y="25.5" width="2.01" height="2.4" />
                        <rect x="74.5" y="33" width="2.01" height="2.4" />
                    </g>

                    {/* Resistors */}
                    <g fill="#e5e5e5">
                        <rect x="12" y="21.3" width="3.83" height="9.3" />
                        <rect x="17.7" y="21.3" width="3.83" height="9.3" />
                        <rect x="56.5" y="21.3" width="3.83" height="9.3" />
                        <rect x="51.2" y="21.3" width="3.83" height="9.3" />
                        <rect x="17.7" y="35.6" width="3.83" height="9.3" />
                        <rect x="23.3" y="21.3" width="3.83" height="9.3" />
                        <rect x="62.2" y="21.3" width="3.83" height="9.3" />
                        <rect x="51.2" y="35.8" width="3.83" height="9.3" />
                        <rect x="56.9" y="35.8" width="3.83" height="9.3" />
                    </g>
                    <path d="m76 42.6v-3.13h-7.59v3.13z" fill="#fefdf4" />
                    <rect x="23.1" y="35.6" width="3.83" height="9.3" fill="#e5e5e5" />

                    <g fill="#26232b">
                        <rect x="17.7" y="23.4" width="3.83" height="5.31" />
                        <rect x="56.5" y="23.4" width="3.83" height="5.31" />
                        <rect x="51.2" y="23.4" width="3.83" height="5.31" />
                        <rect x="17.7" y="37.7" width="3.83" height="5.31" />
                    </g>
                    <g fill="#d8c18d">
                        <rect x="23.3" y="23.4" width="3.83" height="5.31" />
                        <rect x="62.2" y="23.4" width="3.83" height="5.31" />
                        <rect x="51.2" y="37.8" width="3.83" height="5.31" />
                        <rect x="56.9" y="37.8" width="3.83" height="5.31" />
                        <path d="m74.3 42.6v-3.13h-4.33v3.13z" />
                    </g>
                    <g>
                        <rect x="23.1" y="37.7" width="3.83" height="5.31" fill="#a06352" />
                        <rect x="31.8" y="47.1" width="15.6" height="6.03" fill="#f3c338" />
                        <rect x="67.3" y="27.9" width="9.76" height="5.28" fill="#010303" />
                    </g>

                    {/* MPU6050 Chip */}
                    <rect transform="translate(47,26)" width="5" height="14.5" fill={`url(#pin-pattern-${state?.id || 'default'})`} />
                    <rect
                        transform="translate(32.3,40) rotate(180)"
                        width="5"
                        height="14.5"
                        fill={`url(#pin-pattern-${state?.id || 'default'})`}
                    />
                    <rect
                        transform="translate(46.5,40.7) rotate(90)"
                        width="5"
                        height="14.5"
                        fill={`url(#pin-pattern-${state?.id || 'default'})`}
                    />
                    <rect
                        transform="translate(32.3,26) rotate(270)"
                        width="5"
                        height="14.5"
                        fill={`url(#pin-pattern-${state?.id || 'default'})`}
                    />
                    <rect x="31.8" y="25.4" width="15.6" height="15.6" />

                    {/* LED */}
                    <rect x="12" y="23.4" width="3.83" height="5.31" fill="#f5ecde" />
                    <filter id={`ledFilter-${state?.id || 'default'}`} x="-0.8" y="-0.8" height="5.2" width="5.8">
                        <feGaussianBlur stdDeviation="2" />
                    </filter>
                    {powered && (
                        <circle cx="13.9" cy="25.5" r="3.5" fill="#80ff80" filter={`url(#ledFilter-${state?.id || 'default'})`} />
                    )}

                    {/* PCB Pins copied EXACTLY from wokwi reference */}
                    <g fill="none" stroke="#d0ae88" strokeWidth=".648px">
                        <circle cx="64.8" cy="5.78" r="2.81" />
                        <circle cx="55.2" cy="5.78" r="2.81" />
                        <circle cx="45.6" cy="5.78" r="2.81" />
                        <circle cx="36" cy="5.78" r="2.81" />
                        <circle cx="26.4" cy="5.78" r="2.81" />
                        <circle cx="16.9" cy="5.78" r="2.81" />
                        <circle cx="7.28" cy="5.78" r="2.81" />
                        <circle cx="74.4" cy="5.78" r="2.81" />
                    </g>

                    {/* Text copied EXACTLY from wokwi reference */}
                    <text
                        transform="rotate(90)"
                        fill="#ffffff"
                        fontFamily="sans-serif"
                        fontSize="3.6px"
                        x="10.056"
                    >
                        <tspan x="10.056" y="-6">INT</tspan>
                        <tspan x="10.056" y="-15.5">AD0</tspan>
                        <tspan x="10.056" y="-25.157">XCL</tspan>
                        <tspan x="10.056" y="-34.5">XDA</tspan>
                        <tspan x="10.056" y="-44.38">SDA</tspan>
                        <tspan x="9.911" y="-54">SCL</tspan>
                        <tspan x="10.057" y="-63.54">GND</tspan>
                        <tspan x="10.057" y="-73">VCC</tspan>
                    </text>
                </g>
            </svg>
        </div>
    );
};
