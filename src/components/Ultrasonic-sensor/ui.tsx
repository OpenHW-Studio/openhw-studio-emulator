import React, { useState, useRef, useCallback } from 'react';
const BOUNDS = { w: 172.5, h: 114 };


export const HCSR04UI = ({ state, attrs, isRunning }: { state: any, attrs: any, isRunning: boolean }) => {
    const isSidebar = !attrs.id;
    const [showCone, setShowCone] = useState(false);
    // Initial dot position relative to center of the sensor board
    const [dotPos, setDotPos] = useState({ x: 0, y: -200 });
    const [isDragging, setIsDragging] = useState(false);
    const [inCone, setInCone] = useState(true);

    const svgRef = useRef<SVGSVGElement>(null);
    const lastPos = useRef({ x: 0, y: -200 });

    const triggerDistance = useCallback((distCm: number) => {
        if (attrs.onInteract) {
            attrs.onInteract({ type: 'distance', value: distCm });
        }
    }, [attrs]);

    const calculateDistance = useCallback((x: number, y: number) => {
        let rawDistPx = Math.sqrt(x * x + y * y);
        let distPx = rawDistPx;

        // Exact length limit of 330
        if (distPx > 330) distPx = 330;
        if (distPx < 3) distPx = 3;

        // Angle constraint matching exactly to our visual cone (-130 to -50 degrees)
        const angle = Math.atan2(y, x) * 180 / Math.PI;
        let isInside = true;

        if (angle < -130 || angle > -50) {
            if (y < 0) isInside = false;
        }
        if (y >= 0) isInside = false;

        // Turn red if it crosses outside exactly the 330 pixel arc boundary
        if (rawDistPx > 330) isInside = false;

        setInCone(isInside);

        const distCm = Math.round(distPx * 10) / 10;
        triggerDistance(isInside ? distCm : 400);
        lastPos.current = { x, y };

        return distCm;
    }, [triggerDistance]);

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
        const svgX = ((e.clientX - rect.left) / rect.width) * 800;
        const svgY = ((e.clientY - rect.top) / rect.height) * 800;

        const newX = svgX - 400;
        const newY = svgY - 400;

        setDotPos({ x: newX, y: newY });
        calculateDistance(newX, newY);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDragging) return;
        e.stopPropagation();
        setIsDragging(false);
        (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    };

    const toggleCone = (e: React.MouseEvent) => {
        if (!isRunning) return;
        e.stopPropagation();
        e.preventDefault();

        setShowCone((prev: boolean) => {
            const next = !prev;
            if (next) {
                calculateDistance(dotPos.x, dotPos.y);
            }
            return next;
        });
    };

    const distCm = state?.distance ?? 169.6;
    const distIn = (distCm / 2.54).toFixed(1);

    return (
        <div style={{ 
            pointerEvents: 'none', 
            position: isSidebar ? 'relative' : 'absolute', 
            ...(isSidebar ? {} : { inset: 0 }),
            width: isSidebar ? BOUNDS.w : 'auto',
            height: isSidebar ? BOUNDS.h : 'auto'
        }}>
            {showCone && isRunning && !isSidebar && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, zIndex: 100, pointerEvents: 'none' }}>
                    <svg ref={svgRef} style={{ position: 'absolute', left: -400 + (BOUNDS.w / 2), top: -400 + (BOUNDS.h / 2) - 50, width: 800, height: 800, overflow: 'visible', pointerEvents: 'none' }}>

                        {/* Redrawn cone to exactly mirror the mathematical constraints of Radius = 330 and Angles = -130 to -50 */}
                        <path
                            d="M 400 400 L 188 147 A 330 330 0 0 1 612 147 Z"
                            fill={inCone ? "#dcfce7" : "#fee2e2"}
                            opacity="0.6"
                        />

                        <line x1={375} y1={400} x2={400 + dotPos.x} y2={400 + dotPos.y} stroke="#94a3b8" strokeWidth="3" strokeDasharray="8,8" />
                        <line x1={425} y1={400} x2={400 + dotPos.x} y2={400 + dotPos.y} stroke="#94a3b8" strokeWidth="3" strokeDasharray="8,8" />

                        {inCone && (
                            <text
                                x={400 + dotPos.x}
                                y={400 + dotPos.y - 30}
                                textAnchor="middle"
                                fill="#0369a1"
                                fontSize="15"
                                fontWeight="bold"
                                style={{ userSelect: 'none' }}
                            >
                                {distIn}in / {distCm.toFixed(1)}cm
                            </text>
                        )}

                        <circle
                            cx={400 + dotPos.x}
                            cy={400 + dotPos.y}
                            r="8"
                            fill={inCone ? "#0ea5e9" : "#ef4444"}
                            stroke={inCone ? "#0284c7" : "#b91c1c"}
                            strokeWidth="4"
                            style={{ pointerEvents: 'auto', cursor: isDragging ? 'grabbing' : 'grab' }}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                        />
                    </svg>
                </div>
            )}

            <div
                onMouseDown={(e: React.MouseEvent) => { if (isRunning) e.stopPropagation(); }}
                onClick={toggleCone}
                style={{
                    position: 'relative',
                    width: BOUNDS.w,
                    height: BOUNDS.h,
                    cursor: isRunning ? 'pointer' : 'default',
                    pointerEvents: isRunning ? 'auto' : 'none',
                    minWidth: BOUNDS.w,
                    minHeight: BOUNDS.h
                }}>

                {React.createElement('wokwi-hc-sr04', {
                    distance: distCm,
                    style: { pointerEvents: 'none', width: '100%', height: '100%' },
                    ...attrs
                })}

            </div>
        </div>
    );
};
