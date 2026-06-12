export const BOUNDS = { x: 0, y: 0, w: 57, h: 120 };

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

    return (
        <div
            onMouseDown={(e: React.MouseEvent) => { if (isRunning) e.stopPropagation(); }}
            style={{
                position: 'relative',
                width: BOUNDS.w,
                height: BOUNDS.h,
                pointerEvents: isRunning ? 'auto' : 'none',
                padding: '0px 0 0 0px',
                boxSizing: 'border-box'
            }}
        >
            {React.createElement('wokwi-dht22', {
                style: { width: '100%', height: '100%' },
                ...attrs
            })}

            {/* Floating Control Sliders */}
            {isRunning && (
                <div style={{
                    position: 'absolute',
                    top: BOUNDS.h + 5,
                    left: -30,
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
