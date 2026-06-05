export const BOUNDS = { x: 0, y: 0, w: 105, h: 210 };

import React, { useState } from 'react';

export const DHT22UI = ({ state, attrs, isRunning }: { state: any, attrs: any, isRunning: boolean }) => {
    // Default 24C, 50% Humidity
    const [temperature, setTemperature] = useState(state?.temperature ?? 24.0);
    const [humidity, setHumidity] = useState(state?.humidity ?? 50.0);

    const handleTempChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        const val = parseFloat(e.target.value);
        setTemperature(val);
        if (attrs.onInteract) attrs.onInteract({ type: 'temperature', value: val });
    };

    const handleHumdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        const val = parseFloat(e.target.value);
        setHumidity(val);
        if (attrs.onInteract) attrs.onInteract({ type: 'humidity', value: val });
    };

    // Scale from 2.54mm internal pitch to 15px external pitch
    const S = 15 / 2.54; // 5.9055118
    // Translate so the first pin (x=3.945, y=30.885) lands perfectly at (30, 195)
    const TX = 30 / S - 3.945; // 1.135
    const TY = 195 / S - 30.885; // 2.135
    // Wait, translating the SVG coordinate system is simpler if we just apply the translate *before* the scale.
    // So transform = `scale(${S}) translate(${TX}, ${TY})`.
    // TX = (30 / S) - 3.945 = 5.08 - 3.945 = 1.135
    // TY = (195 / S) - 30.885 = 33.02 - 30.885 = 2.135

    return (
        <div
            onMouseDown={(e: React.MouseEvent) => { if (isRunning) e.stopPropagation(); }}
            style={{
                position: 'relative',
                width: BOUNDS.w,
                height: BOUNDS.h,
                pointerEvents: isRunning ? 'auto' : 'none',
                padding: 0,
                boxSizing: 'border-box'
            }}
        >
            <svg
                width="100%"
                height="100%"
                version="1.1"
                viewBox={`0 0 ${BOUNDS.w} ${BOUNDS.h}`}
                xmlns="http://www.w3.org/2000/svg"
                style={{ overflow: 'visible' }}
            >
                <g transform={`scale(${S}) translate(${TX}, ${TY})`}>
                    <g fill="#ccc" strokeLinecap="round" strokeWidth=".21">
                        <rect x="3.57" y="23.885" width=".75" height="7" rx=".2" />
                        <rect x="6.11" y="23.885" width=".75" height="7" rx=".2" />
                        <rect x="8.65" y="23.885" width=".75" height="7" rx=".2" />
                        <rect x="11.19" y="23.885" width=".75" height="7" rx=".2" />
                    </g>
                    <path
                        d="M15.05 23.995V5.033m0 0c0-.107-1.069-4.962-2.662-4.96L2.803.09C1.193.09.05 4.926.05 5.033v18.962c0 .107.086.192.192.192h14.616a.192.192 0 00.192-.192M7.615.948h.004c1.08 0 1.956.847 1.956 1.892s-.876 1.892-1.956 1.892-1.956-.847-1.956-1.892c0-1.044.873-1.89 1.952-1.892zM4.967 8.66H5.9a.21.21 0 01.211.21v.935a.21.21 0 01-.21.21h-.934a.21.21 0 01-.212-.21V8.87a.21.21 0 01.212-.211zm2.168 0h.934a.21.21 0 01.21.21v.935a.21.21 0 01-.21.21h-.934a.21.21 0 01-.21-.21V8.87a.21.21 0 01.21-.211zm2.152 0h.935a.21.21 0 01.21.21v.935a.21.21 0 01-.21.21h-.935a.21.21 0 01-.21-.21V8.87a.21.21 0 01.21-.211zm5.757 0v1.356m0 0h-3.217a.553.553 0 01-.554-.554v-.249a.55.55 0 01.554-.553h3.217M.05 8.66h3.282c.307 0 .554.247.554.553v.25a.552.552 0 01-.554.553H.05m0 1.054h3.282c.307 0 .554.247.554.554v.249a.552.552 0 01-.554.554H.05m4.917-1.357H5.9a.21.21 0 01.211.211v.934a.21.21 0 01-.21.211h-.934a.21.21 0 01-.212-.21v-.935a.21.21 0 01.212-.21zm2.168 0h.934a.21.21 0 01.211.211v.934a.21.21 0 01-.211.211h-.934a.21.21 0 01-.21-.21v-.935a.21.21 0 01.21-.21zm2.153 0h.934a.21.21 0 01.21.211v.934a.21.21 0 01-.21.211h-.934a.21.21 0 01-.211-.21v-.935a.21.21 0 01.21-.21zm2.539 0h3.217v1.356h-3.217a.552.552 0 01-.554-.553v-.25c0-.306.247-.553.554-.553zM.05 13.547h3.282c.307 0 .553.247.553.554v.249a.552.552 0 01-.553.553H.05m4.916-1.356H5.9a.21.21 0 01.211.211v.934a.21.21 0 01-.21.211h-.935a.21.21 0 01-.21-.21v-.935a.21.21 0 01.21-.21zm2.169 0h.933a.21.21 0 01.212.211v.934a.21.21 0 01-.212.211h-.933a.21.21 0 01-.211-.21v-.935a.21.21 0 01.21-.21zm2.152 0h.934a.21.21 0 01.211.211v.934a.21.21 0 01-.21.211h-.935a.21.21 0 01-.21-.21v-.935a.21.21 0 01.21-.21zm5.757 1.356h-3.217a.552.552 0 01-.554-.553v-.25c0-.306.247-.553.554-.553h3.217m0 3.791h-3.218a.553.553 0 01-.553-.554v-.249c0-.306.247-.553.553-.553h3.218m-14.994 0h3.282c.307 0 .553.247.553.553v.25a.552.552 0 01-.553.553H.05m4.916-1.356H5.9a.21.21 0 01.211.211v.934a.21.21 0 01-.21.21h-.935a.21.21 0 01-.21-.21v-.934a.21.21 0 01.21-.21zm2.169 0h.934a.21.21 0 01.21.211v.934a.21.21 0 01-.21.21h-.934a.21.21 0 01-.211-.21v-.934a.21.21 0 01.211-.21zm2.152 0h.934a.21.21 0 01.211.211v.934a.21.21 0 01-.21.21h-.935a.21.21 0 01-.21-.21v-.934a.21.21 0 01.21-.21zM.05 18.362h3.282c.307 0 .553.247.553.554v.25a.552.552 0 01-.553.552H.05m4.916-1.355H5.9a.21.21 0 01.211.21v.934a.21.21 0 01-.21.211h-.935a.21.21 0 01-.21-.21v-.934a.21.21 0 01.21-.211zm2.169 0h.933a.21.21 0 01.212.21v.934a.21.21 0 01-.212.211h-.933a.21.21 0 01-.211-.21v-.934a.21.21 0 01.21-.211zm2.152 0h.934a.21.21 0 01.211.21v.934a.21.21 0 01-.21.211h-.935a.21.21 0 01-.21-.21v-.934a.21.21 0 01.21-.211zm5.757 1.355h-3.218a.552.552 0 01-.553-.553v-.25c0-.306.247-.552.553-.552h3.218M10.49 5.056V7.31a.192.192 0 01-.193.193h-.85a.192.192 0 01-.193-.193V5.056H8.23v2.286a.192.192 0 01-.192.192h-.851a.192.192 0 01-.193-.192V5.056H5.94v2.286a.192.192 0 01-.193.192h-.85a.192.192 0 01-.193-.192V5.056C.033 5.025.05 5.033.05 5.033m15 0l-4.56.023v0"
                        fill="#f2f2f2"
                        stroke="#000"
                        strokeLinecap="round"
                        strokeWidth=".1"
                    />
                    <text
                        x="3.741"
                        y="22.863"
                        fill="#000000"
                        fontFamily="sans-serif"
                        fontSize="2.2px"
                        strokeWidth=".05"
                        style={{ lineHeight: 1.25 }}
                    >
                        DHT22
                    </text>
                </g>
            </svg>

            {/* Floating Control Sliders */}
            {isRunning && (
                <div style={{
                    position: 'absolute',
                    top: BOUNDS.h + 5,
                    left: -7,
                    width: 120,
                    background: '#282c34',
                    border: '1px solid #444',
                    borderRadius: 6,
                    padding: 8,
                    color: 'white',
                    fontFamily: 'sans-serif',
                    fontSize: 10,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                    zIndex: 50,
                    pointerEvents: 'auto'
                }}>
                    <div style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span>Temp</span>
                            <span style={{ color: '#ff6b6b' }}>{temperature.toFixed(1)}°C</span>
                        </div>
                        <input
                            type="range"
                            min="-40"
                            max="80"
                            step="0.1"
                            value={temperature}
                            onChange={handleTempChange}
                            onPointerDown={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            style={{ width: '100%', cursor: 'pointer' }}
                        />
                    </div>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span>Humidity</span>
                            <span style={{ color: '#339af0' }}>{humidity.toFixed(1)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="0.1"
                            value={humidity}
                            onChange={handleHumdChange}
                            onPointerDown={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            style={{ width: '100%', cursor: 'pointer' }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
