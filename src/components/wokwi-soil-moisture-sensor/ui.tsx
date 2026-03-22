import React, { useState, useCallback } from 'react';
import { BOUNDS } from './constants';

export const SoilMoistureSensorUI = ({ state, attrs, isRunning }: { state: any, attrs: any, isRunning: boolean }) => {
    const [moistureLevel, setMoistureLevel] = useState(0);

    const triggerMoisture = useCallback((level: number) => {
        if (attrs.onInteract) {
            attrs.onInteract({ type: 'moisture_level', value: level });
        }
    }, [attrs]);

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        const val = parseInt(e.target.value);
        setMoistureLevel(val);
        triggerMoisture(val);
    };

    const moisturePct = Math.round((moistureLevel / 1023) * 100);
    const dryColor = '#d4a574';
    const wetColor = '#2563eb';

    return (
        <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0 }}>
            <div
                onMouseDown={(e: React.MouseEvent) => { if (isRunning) e.stopPropagation(); }}
                style={{
                    position: 'relative',
                    width: BOUNDS.w,
                    height: BOUNDS.h,
                    pointerEvents: isRunning ? 'auto' : 'none',
                    minWidth: BOUNDS.w,
                    minHeight: BOUNDS.h
                }}
            >
                {/* Native Wokwi soil moisture sensor web component */}
                {React.createElement('wokwi-soil-moisture-sensor', {
                    moisture: moisturePct,
                    style: { pointerEvents: 'none', width: '100%', height: '100%' },
                    ...attrs
                })}

                {/* Horizontal Slider Overlay */}
                {isRunning && (
                    <div style={{
                        position: 'absolute',
                        bottom: 45,
                        left: 10,
                        right: 10,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        pointerEvents: 'auto',
                        zIndex: 20
                    }}>
                        {/* Dry drop icon */}
                        <svg width="14" height="18" viewBox="-8 -10 16 20" style={{ flexShrink: 0 }}>
                            <path d="M 0 -8 Q -6 0 0 8 Q 6 0 0 -8 Z" fill="none" stroke="#1e3a5f" strokeWidth="1.5" />
                        </svg>

                        <input
                            type="range"
                            min="0"
                            max="1023"
                            value={moistureLevel}
                            onChange={handleSliderChange}
                            onPointerDown={(e) => e.stopPropagation()}
                            style={{
                                width: '100%',
                                height: 6,
                                appearance: 'none',
                                WebkitAppearance: 'none',
                                background: `linear-gradient(to right, ${dryColor}, ${wetColor})`,
                                borderRadius: 4,
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        />

                        {/* Wet drop icon */}
                        <svg width="14" height="18" viewBox="-8 -10 16 20" style={{ flexShrink: 0 }}>
                            <path d="M 0 -8 Q -6 0 0 8 Q 6 0 0 -8 Z" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="1" />
                        </svg>
                    </div>
                )}

                {/* Moisture percentage label */}
                {isRunning && (
                    <div style={{
                        position: 'absolute',
                        bottom: 28,
                        left: 0,
                        right: 0,
                        textAlign: 'center',
                        fontSize: 11,
                        fontWeight: 'bold',
                        color: moistureLevel > 512 ? '#2563eb' : '#92400e',
                        fontFamily: 'monospace',
                        pointerEvents: 'none',
                        zIndex: 20
                    }}>
                        {moisturePct}% moisture
                    </div>
                )}
            </div>
        </div>
    );
};
