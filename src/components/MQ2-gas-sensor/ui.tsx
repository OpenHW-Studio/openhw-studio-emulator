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
                <svg width="100%" height="100%" viewBox="0 0 137 59.5" style={{ pointerEvents: 'none', position: 'absolute', top: 0, left: 0 }}>
                  <defs>
                    <pattern id="meshPattern2" width="4.1" height="4.1" patternUnits="userSpaceOnUse">
                      <path
                        d="m0 0v4.09h0.4v-0.85l0.42 0.381v0.469h0.4v-0.0996l0.109 0.0996h0.711v-0.799l0.42 0.379v0.42h0.398v-0.0488l0.0547 0.0488h0.766v-0.75l0.42 0.381v0.369h0.4v-4.09h-0.4v0.311l-0.334-0.311h-0.598l0.111 0.0996v0.9l-0.42-0.379v-0.621h-0.398v0.25l-0.277-0.25h-0.6l0.0566 0.0508v0.9l-0.42-0.381v-0.57h-0.4v0.201l-0.223-0.201zm0.4 0.359 0.42 0.381v0.9l-0.42-0.381zm1.64 0.0508 0.42 0.391v0.889l-0.42-0.379zm1.64 0.0605 0.42 0.379v0.891l-0.42-0.381zm-2.46 0.639 0.42 0.381v0.9l-0.42-0.381zm1.64 0.0508 0.42 0.381v0.898l-0.42-0.379zm-2.46 0.641 0.42 0.379v0.9l-0.42-0.379zm1.64 0.0488 0.42 0.381v0.9l-0.42-0.381zm1.64 0.0508 0.42 0.379v0.9l-0.42-0.379zm-2.46 0.65 0.42 0.379v0.9l-0.42-0.379zm1.64 0.0488 0.42 0.381v0.9l-0.42-0.381z"
                        fill="#949392"
                      />
                    </pattern>
                    <g id="wokwiPin">
                      <path
                        fill="#c6bf95"
                        d="m29 4.6c0.382 0 0.748-0.152 1.02-0.422s0.422-0.636 0.422-1.02v-1e-3c0-0.382-0.152-0.748-0.422-1.02s-0.636-0.422-1.02-0.422h-26.1c-0.234 0-0.423 0.189-0.423 0.423v2.04c0 0.234 0.189 0.423 0.423 0.423h26.1z"
                      />
                      <rect x="0" y="0" width="6.9" height="6.9" />
                    </g>
                    <filter id="ledFilter">
                      <feGaussianBlur stdDeviation="0.5" />
                    </filter>
                  </defs>

                  {/* Board */}
                  <path
                    d="m113 0h-113v59.5h113zm-1.6 53.2c0 2.62-2.12 4.74-4.74 4.74s-4.74-2.12-4.74-4.74c0-2.62 2.12-4.74 4.74-4.74s4.74 2.12 4.74 4.74zm-110 0c0 2.62 2.12 4.74 4.74 4.74 2.62 0 4.74-2.12 4.74-4.74 0-2.62-2.12-4.74-4.74-4.74-2.62 0-4.74 2.12-4.74 4.74zm105-51.6c2.62 0 4.74 2.12 4.74 4.74 0 2.62-2.12 4.74-4.74 4.74s-4.74-2.12-4.74-4.74c0-2.62 2.12-4.74 4.74-4.74zm-101 0c-2.62 0-4.74 2.12-4.74 4.74 0 2.62 2.12 4.74 4.74 4.74 2.62 0 4.74-2.12 4.74-4.74 0-2.62-2.12-4.74-4.74-4.74z"
                    fill="#0664af"
                  />

                  {/* Pins aligned to manifest y=5, 20, 35, 50 (pin center is y+4.6) */}
                  <use href="#wokwiPin" x="107" y="0.4" />
                  <use href="#wokwiPin" x="107" y="15.4" />
                  <use href="#wokwiPin" x="107" y="30.4" />
                  <use href="#wokwiPin" x="107" y="45.4" />

                  {/* Sensor */}
                  <circle cx="47.7" cy="29.8" r="31.2" fill="none" stroke="#fff" strokeWidth=".4px" />
                  <circle cx="47.7" cy="29.8" r="28.8" fill="#dedede" />
                  <circle cx="47.7" cy="29.8" r="25.8" fill="#d0ccc4" />
                  <circle cx="47.7" cy="29.8" r="21.4" fill="#bab3ad" />
                  <circle cx="47.7" cy="29.8" r="21.4" fill="url(#meshPattern2)" />

                  <text fill="#ffffff" fontFamily="sans-serif" fontSize="3.72px">
                    <tspan x="94.656" y="5.5">AOUT</tspan>
                    <tspan x="94.656" y="20.5">DOUT</tspan>
                    <tspan x="94.656" y="35.5">GND</tspan>
                    <tspan x="94.656" y="50.5">VCC</tspan>
                  </text>

                  {/* LEDs */}
                  <rect
                    style={{ opacity:1, fill:'#999999', strokeWidth:1.5747 }}
                    width="8.5262499"
                    height="3.8281121"
                    x="81.321793"
                    y="5.8179226"
                  />
                  <rect
                    style={{ opacity:1, fill:'#e6e6e6', strokeWidth:2.05589 }}
                    width="4.8444595"
                    height="3.8281121"
                    x="83.162689"
                    y="5.8179226"
                  />
                  <circle cx="85.5" cy="8" r="1.8" fill="#03f704" filter="url(#ledFilter)" />
                  
                  <rect
                    style={{ fill:'#999999', strokeWidth:1.5747 }}
                    width="8.5262499"
                    height="3.8281121"
                    x="81.018036"
                    y="48.700188"
                  />
                  <rect
                    style={{ fill:'#e6e6e6', strokeWidth:2.05589 }}
                    width="4.8444595"
                    height="3.8281121"
                    x="82.858932"
                    y="48.700188"
                  />
                  {isExceeded && <circle cx="85" cy="50" r="1.8" fill="#03f704" filter="url(#ledFilter)" />}
                  
                  <text fill="#ffffff" fontFamily="sans-serif" fontSize="3px">
                    <tspan x="80.213432" y="4.7265162">PWR LED</tspan>
                    <tspan x="80.463821" y="55.852409">D0 LED</tspan>
                  </text>
                </svg>
            </div>
        </div>
    );
};
