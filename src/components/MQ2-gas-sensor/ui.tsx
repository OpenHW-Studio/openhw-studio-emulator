export const BOUNDS = { x: 0, y: 0, w: 138, h: 63 };

import React, { useState, useRef, useCallback, useEffect } from 'react';

export const GasContextMenu = ({ attrs, onUpdate }: { attrs: any, onUpdate: (key: string, value: any) => void }) => {
    const current = attrs?.threshold ?? 300;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>Threshold:</span>
            <input
                type="range"
                min="0"
                max="1023"
                value={current}
                onChange={e => onUpdate('threshold', parseInt(e.target.value))}
                style={{ width: 100 }}
            />
            <span style={{ fontSize: 12, color: 'var(--text)', minWidth: 24 }}>{current}</span>
        </div>
    );
};

export const GasSensorUI = ({ state, attrs, isRunning }: { state: any, attrs: any, isRunning: boolean }) => {
    const [showCloud, setShowCloud] = useState(false);
    const [cloudPos, setCloudPos] = useState({ x: 0, y: -150 });
    const [isDragging, setIsDragging] = useState(false);
    
    const svgRef = useRef<SVGSVGElement>(null);
    const lastPos = useRef({ x: 0, y: -150 });

    const triggerGasLevel = useCallback((level: number) => {
        if (attrs.onInteract) {
            attrs.onInteract({ type: 'gas_level', value: level });
        }
    }, [attrs]);

    const calculateGasLevel = useCallback((x: number, y: number) => {
        const dx = x - (BOUNDS.w / 2);
        const dy = y - (BOUNDS.h / 2);
        // distance from center of sensor
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        let level = 0;
        if (dist <= 30) {
            level = 1023;
        } else if (dist >= 250) {
            level = 0;
        } else {
            // Linear mapping
            const ratio = 1 - ((dist - 30) / 220);
            level = Math.round(ratio * 1023);
        }

        // Only emit event if changed significantly to avoid spam
        triggerGasLevel(level);
        lastPos.current = { x, y };
    }, [triggerGasLevel]);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!isRunning) return;
        e.stopPropagation();
        e.preventDefault();
        setIsDragging(true);
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || !svgRef.current) return;
        e.stopPropagation();

        const rect = svgRef.current.getBoundingClientRect();
        // The SVG is 400x400
        const svgX = ((e.clientX - rect.left) / rect.width) * 400;
        const svgY = ((e.clientY - rect.top) / rect.height) * 400;

        const newX = svgX - 200 + (BOUNDS.w / 2);
        const newY = svgY - 200 + (BOUNDS.h / 2);

        setCloudPos({ x: newX, y: newY });
        calculateGasLevel(newX, newY);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDragging) return;
        e.stopPropagation();
        setIsDragging(false);
        (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    };

    const toggleCloud = (e: React.MouseEvent) => {
        if (!isRunning) return;
        e.stopPropagation();
        e.preventDefault();
        
        setShowCloud((prev: boolean) => {
            const next = !prev;
            if (next) {
                // Instantly calculate gas based on current cloud position
                calculateGasLevel(cloudPos.x, cloudPos.y);
            } else {
                // If cloud hidden, set gas to 0 immediately
                triggerGasLevel(0);
            }
            return next;
        });
    };

    const isExceeded = state?.limitExceeded;

    return (
        <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0 }}>
            {showCloud && isRunning && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, zIndex: 100, pointerEvents: 'none' }}>
                    <svg ref={svgRef} style={{ position: 'absolute', left: -200 + (BOUNDS.w / 2), top: -200 + (BOUNDS.h / 2), width: 400, height: 400, overflow: 'visible', pointerEvents: 'none' }}>
                        <defs>
                            <radialGradient id="gasGradient" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="rgba(80, 80, 80, 0.8)" />
                                <stop offset="40%" stopColor="rgba(120, 120, 120, 0.5)" />
                                <stop offset="70%" stopColor="rgba(180, 180, 180, 0.2)" />
                                <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
                            </radialGradient>
                            <filter id="cloudBlur">
                                <feGaussianBlur stdDeviation="8" />
                            </filter>
                        </defs>
                        
                        {/* Connecting dashed line from sensor to cloud */}
                        <line
                            x1={cloudPos.x + 200 - (BOUNDS.w / 2)}
                            y1={cloudPos.y + 200 - (BOUNDS.h / 2)}
                            x2={200} // Center of 400x400 svg
                            y2={200}
                            stroke={isDragging ? "#3b82f6" : "#94a3b8"}
                            strokeWidth="2"
                            strokeDasharray="4,4"
                            opacity="0.6"
                        />
                        
                        {/* Draggable Cloud Group */}
                        <g 
                            transform={`translate(${cloudPos.x + 200 - (BOUNDS.w / 2)}, ${cloudPos.y + 200 - (BOUNDS.h / 2)})`}
                            style={{ pointerEvents: 'auto', cursor: isDragging ? 'grabbing' : 'grab' }}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                        >
                            {/* Gas Cloud Shape (a set of overlapping circles with blur) */}
                            <circle cx="0" cy="0" r="45" fill="url(#gasGradient)" filter="url(#cloudBlur)" />
                            <circle cx="-15" cy="-10" r="35" fill="url(#gasGradient)" filter="url(#cloudBlur)" />
                            <circle cx="20" cy="5" r="40" fill="url(#gasGradient)" filter="url(#cloudBlur)" />
                            <circle cx="-5" cy="20" r="30" fill="url(#gasGradient)" filter="url(#cloudBlur)" />
                            
                            {/* Grip Indicator Dot */}
                            <circle cx="0" cy="0" r="4" fill={isDragging ? "#3b82f6" : "#cbd5e1"} stroke="white" strokeWidth="1" />
                        </g>
                    </svg>
                </div>
            )}

            <div
                onMouseDown={(e: React.MouseEvent) => { if (isRunning) e.stopPropagation(); }}
                onClick={toggleCloud}
                style={{
                    position: 'relative',
                    width: BOUNDS.w,
                    height: BOUNDS.h,
                    cursor: isRunning ? 'pointer' : 'default',
                    pointerEvents: isRunning ? 'auto' : 'none',
                    minWidth: BOUNDS.w,
                    minHeight: BOUNDS.h
                }}>
                <svg width="100%" height="100%" viewBox={`0 0 ${BOUNDS.w} ${BOUNDS.h}`} style={{ pointerEvents: 'none', position: 'absolute', top: 0, left: 0 }}>
                    {/* PCB Base */}
                    <rect x="5" y="5" width="120" height="53" rx="4" fill="#0369a1" />
                    
                    {/* Mounting holes */}
                    <circle cx="15" cy="15" r="3" fill="#0f172a" />
                    <circle cx="15" cy="48" r="3" fill="#0f172a" />
                    
                    {/* Sensor Head (Silver cylinder) */}
                    <circle cx="45" cy="31" r="22" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" />
                    <circle cx="45" cy="31" r="16" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
                    <path d="M35 21 L55 41 M35 41 L55 21 M45 15 L45 47 M25 31 L65 31" stroke="#94a3b8" strokeWidth="1" opacity="0.5" />
                    
                    {/* Potentiometer (Threshold adjuster) */}
                    <rect x="75" y="38" width="14" height="14" fill="#1e40af" rx="1" />
                    <circle cx="82" cy="45" r="5" fill="#facc15" />
                    <line x1="82" y1="41" x2="82" y2="49" stroke="#854d0e" strokeWidth="2" />
                    
                    {/* Status LEDs */}
                    <circle cx="85" cy="15" r="2" fill="#22c55e" /> {/* Power LED */}
                    <circle cx="95" cy="15" r="2" fill={isExceeded ? "#ef4444" : "#475569"} /> {/* DO LED */}

                    {/* Component Label */}
                    <text x="75" y="28" fill="#e0f2fe" fontSize="10" fontFamily="sans-serif" fontWeight="bold">MQ-2</text>
                    
                    {/* Header Pins Block */}
                    <rect x="125" y="12" width="5" height="39" fill="#1e293b" />
                    {/* Pins (Gold) */}
                    <rect x="130" y="45" width="5" height="2" fill="#eab308" />
                    <rect x="130" y="35" width="5" height="2" fill="#eab308" />
                    <rect x="130" y="25" width="5" height="2" fill="#eab308" />
                    <rect x="130" y="16" width="5" height="2" fill="#eab308" />
                    
                    {/* Pin Labels */}
                    <text x="122" y="49" fill="#f8fafc" fontSize="7" fontFamily="monospace" textAnchor="end">VCC</text>
                    <text x="122" y="39" fill="#f8fafc" fontSize="7" fontFamily="monospace" textAnchor="end">GND</text>
                    <text x="122" y="29" fill="#f8fafc" fontSize="7" fontFamily="monospace" textAnchor="end">DO</text>
                    <text x="122" y="20" fill="#f8fafc" fontSize="7" fontFamily="monospace" textAnchor="end">AO</text>
                </svg>
                {/* Visual indicator light for Digital Threshold Output */}
                {isExceeded && (
                    <div style={{
                        position: 'absolute',
                        top: 10, left: '50%',
                        transform: 'translateX(-50%)',
                        width: 8, height: 8,
                        borderRadius: '50%',
                        background: '#ef4444',
                        boxShadow: '0 0 8px #ef4444',
                        border: '1px solid white',
                        zIndex: 10
                    }} />
                )}
            </div>
        </div>
    );
};
