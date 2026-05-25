export const BOUNDS = { x: 0, y: 0, w: 90, h: 90 };

import React, { useState, useRef, useCallback, useEffect } from 'react';


export const PIRContextMenu = ({ attrs, onUpdate }: { attrs: any, onUpdate: (key: string, value: any) => void }) => {


    const current = attrs?.delay ?? 500;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>Hold Time (ms):</span>
            <input
                type="number"
                step="100"
                min="100"
                max="10000"
                value={current}
                onChange={e => onUpdate('delay', e.target.value)}
                style={{ width: 70, background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: 2, outline: 'none' }}
            />
        </div>
    );
};

const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
    const angleRad = angleDeg * Math.PI / 180;
    return {
        x: cx + r * Math.cos(angleRad),
        y: cy + r * Math.sin(angleRad)
    };
};

const createConePath = () => {
    const cx = 200; // SVG space center matching sensor center X
    const cy = 300; // SVG space center matching sensor center Y
    const r1 = 40;
    const r2 = 280;
    const startAngle = -135;
    const endAngle = -45;

    const p1 = polarToCartesian(cx, cy, r2, startAngle);
    const p2 = polarToCartesian(cx, cy, r2, endAngle);
    const p3 = polarToCartesian(cx, cy, r1, endAngle);
    const p4 = polarToCartesian(cx, cy, r1, startAngle);

    return `M ${p1.x} ${p1.y} A ${r2} ${r2} 0 0 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${r1} ${r1} 0 0 0 ${p4.x} ${p4.y} Z`;
};

export const PIRUI = ({ state, attrs, isRunning }: { state: any, attrs: any, isRunning: boolean }) => {
    const [showCone, setShowCone] = useState(false);
    const [dotPos, setDotPos] = useState({ x: 50, y: -120 });
    const [isDragging, setIsDragging] = useState(false);

    const svgRef = useRef<SVGSVGElement>(null);
    const lastPos = useRef({ x: 50, y: -120 });
    const isMotionActive = useRef(false);
    const stopTimer = useRef<any>(null);

    // Ensure motion stops if the component is unmounted or simulation stops
    useEffect(() => {
        return () => {
            if (stopTimer.current) clearTimeout(stopTimer.current);
        };
    }, []);

    const triggerMotion = useCallback((active: boolean) => {
        if (isMotionActive.current === active) return;
        isMotionActive.current = active;
        if (attrs.onInteract) {
            attrs.onInteract(active ? 'motion_start' : 'motion_stop');
        }
    }, [attrs]);

    const checkMotion = useCallback((x: number, y: number) => {
        const dx = x - 50;
        const dy = y - 50;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;

        const isInside = dist >= 40 && dist <= 280 && angle >= -135 && angle <= -45;
        // Check if actually moved (debounce tiny movements)
        const hasMoved = Math.abs(x - lastPos.current.x) > 0.2 || Math.abs(y - lastPos.current.y) > 0.2;

        if (isInside && hasMoved) {
            triggerMotion(true);

            // Watchdog: If no move events for 150ms, stop motion
            if (stopTimer.current) clearTimeout(stopTimer.current);
            stopTimer.current = setTimeout(() => {
                triggerMotion(false);
            }, 150);
        } else if (!isInside) {
            triggerMotion(false);
            if (stopTimer.current) {
                clearTimeout(stopTimer.current);
                stopTimer.current = null;
            }
        }
        lastPos.current = { x, y };
    }, [attrs, triggerMotion]);

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
        const svgX = ((e.clientX - rect.left) / rect.width) * 400;
        const svgY = ((e.clientY - rect.top) / rect.height) * 400;

        const newX = svgX - 150;
        const newY = svgY - 250;

        setDotPos({ x: newX, y: newY });
        checkMotion(newX, newY);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDragging) return;
        e.stopPropagation();
        setIsDragging(false);
        (e.currentTarget as Element).releasePointerCapture(e.pointerId);

        if (stopTimer.current) {
            clearTimeout(stopTimer.current);
            stopTimer.current = null;
        }
        triggerMotion(false);
    };

    const toggleCone = (e: React.MouseEvent) => {
        if (!isRunning) return;
        e.stopPropagation();
        e.preventDefault();
        setShowCone((prev: boolean) => !prev);
    };

    const isMotion = state?.motion;

    return (
        <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0 }}>
            {showCone && isRunning && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, zIndex: 100, pointerEvents: 'none' }}>
                    <svg ref={svgRef} style={{ position: 'absolute', left: -150, top: -250, width: 400, height: 400, overflow: 'visible', pointerEvents: 'none' }}>
                        <path
                            d={createConePath()}
                            fill={isMotion ? "rgba(239, 68, 68, 0.35)" : "rgba(46, 204, 113, 0.15)"}
                            stroke={isMotion ? "rgba(239, 68, 68, 0.7)" : "rgba(46, 204, 113, 0.4)"}
                            strokeWidth="2.5"
                            style={{ transition: 'fill 0.1s, stroke 0.1s' }}
                        />
                        <line
                            x1={dotPos.x + 150}
                            y1={dotPos.y + 250}
                            x2={200}
                            y2={300}
                            stroke={isDragging ? "#3b82f6" : "#008C9E"}
                            strokeWidth="2"
                            strokeDasharray="4,4"
                            opacity="0.6"
                        />
                        <circle
                            cx={dotPos.x + 150}
                            cy={dotPos.y + 250}
                            r={14}
                            fill={isDragging ? "#2563eb" : "#008C9E"}
                            stroke="white"
                            strokeWidth="2"
                            style={{ pointerEvents: 'auto', cursor: isDragging ? 'grabbing' : 'grab', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
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
                {React.createElement('wokwi-pir-motion-sensor', {
                    style: { pointerEvents: 'none', width: '100%', height: '100%' },
                    ...attrs
                })}
                {/* Visual red indicator light showing active motion state */}
                {isMotion && (
                    <div style={{
                        position: 'absolute',
                        top: 25, left: '50%',
                        transform: 'translateX(-50%)',
                        width: 12, height: 12,
                        borderRadius: '50%',
                        background: '#ef4444',
                        boxShadow: '0 0 10px #ef4444',
                        border: '2px solid white',
                        zIndex: 10
                    }} />
                )}
            </div>
        </div>
    );
};
