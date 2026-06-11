import React, { useRef, useState, useEffect } from 'react';

// Bounding box for the selection area
export const BOUNDS = { x: 0, y: 0, w: 258.75, h: 171 };

export const HCSR04UI = ({ state, attrs, isRunning }: { state: any, attrs: any, isRunning: boolean }) => {
    // Precise Wokwi HC-SR04 native dimensions from doc viewBox
    const nativeW = 172.5;
    const nativeH = 114;
    const scaleX = BOUNDS.w / nativeW;
    const scaleY = BOUNDS.h / nativeH;

    const [showCone, setShowCone] = useState(false);
    const [dotRadius, setDotRadius] = useState(80);  // initial mid-range
    const [dotAngle, setDotAngle] = useState(-Math.PI / 2); // straight up
    const svgRef = useRef<SVGSVGElement>(null);
    const isDragging = useRef(false);
    const wasDragging = useRef(false);

    const rInner = 20;
    const rOuter = 260; // Shorter length
    const halfAngle = Math.PI / 3.5; // Wider span (approx 51.4 deg / 103 deg total)
    const centerAngle = -Math.PI / 2; // straight up
    const angleLeft = centerAngle - halfAngle;
    const angleRight = centerAngle + halfAngle;

    // Hide cone when simulation stops, and sync external state distance changes to internal radius
    useEffect(() => {
        if (!isRunning) {
            setShowCone(false);
        }
    }, [isRunning]);

    useEffect(() => {
        if (state && state.distance !== undefined) {
            const extDist = parseFloat(state.distance);
            if (!isNaN(extDist)) {
                // Inverse map: dist = 2 + ((r - rInner) / (rOuter - rInner)) * 398
                // => (dist - 2) / 398 = (r - rInner) / (rOuter - rInner)
                // => r = rInner + ((dist - 2) / 398) * (rOuter - rInner)
                const targetR = rInner + ((extDist - 2) / 398) * (rOuter - rInner);
                setDotRadius(Math.max(rInner, Math.min(rOuter, targetR)));
            }
        }
    }, [state?.distance]);

    const distance = 2 + ((Math.max(rInner, Math.min(rOuter, dotRadius)) - rInner) / (rOuter - rInner)) * 398;
    
    // Cone apex at top of sensor body (transducer area)
    const x0 = 129.375;  // horizontal center of sensor
    const y0 = -10;       // shifted further upward so both the triangle and text are moved up

    // Dot position
    const xDot = x0 + dotRadius * Math.cos(dotAngle);
    const yDot = y0 + dotRadius * Math.sin(dotAngle);

    // Cone corner points
    const p1x = x0 + rInner * Math.cos(angleLeft);
    const p1y = y0 + rInner * Math.sin(angleLeft);
    const p2x = x0 + rOuter * Math.cos(angleLeft);
    const p2y = y0 + rOuter * Math.sin(angleLeft);
    const p3x = x0 + rOuter * Math.cos(angleRight);
    const p3y = y0 + rOuter * Math.sin(angleRight);
    const p4x = x0 + rInner * Math.cos(angleRight);
    const p4y = y0 + rInner * Math.sin(angleRight);
    const conePath = `M ${p1x} ${p1y} L ${p2x} ${p2y} A ${rOuter} ${rOuter} 0 0 1 ${p3x} ${p3y} L ${p4x} ${p4y} A ${rInner} ${rInner} 0 0 0 ${p1x} ${p1y} Z`;

    // Transducer centers (approximated in BOUNDS coords, kept at transducer centers on the sensor image)
    const xT = 80, yT = 42, xR = 178, yR = 42;

    const handleSensorClick = (e: React.MouseEvent) => {
        if (!isRunning || isDragging.current || wasDragging.current) {
            wasDragging.current = false;
            return;
        }
        e.stopPropagation();
        setShowCone(prev => !prev);
    };

    const handleDotPointerDown = (e: React.PointerEvent) => {
        if (!isRunning) return;
        e.stopPropagation();
        e.preventDefault();
        isDragging.current = true;
        wasDragging.current = false;
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
    };

    const handleSvgPointerMove = (e: React.PointerEvent) => {
        if (!isDragging.current || !svgRef.current) return;
        e.stopPropagation();
        e.preventDefault();
        wasDragging.current = true;
        const rect = svgRef.current.getBoundingClientRect();
        const lx = ((e.clientX - rect.left) / rect.width) * BOUNDS.w;
        const ly = ((e.clientY - rect.top) / rect.height) * BOUNDS.h;
        const dx = lx - x0, dy = ly - y0;
        const r = Math.sqrt(dx*dx + dy*dy);
        let angle = Math.atan2(dy, dx);
        // Normalize so we're working around -PI/2
        while (angle > centerAngle + Math.PI) angle -= 2*Math.PI;
        while (angle < centerAngle - Math.PI) angle += 2*Math.PI;
        const clampedR = Math.max(rInner, Math.min(rOuter, r));
        const clampedAngle = Math.max(angleLeft, Math.min(angleRight, angle));
        setDotRadius(clampedR);
        setDotAngle(clampedAngle);
        const newDist = 2 + ((clampedR - rInner) / (rOuter - rInner)) * 398;
        attrs?.onInteract?.({ type: 'SET_ATTR', key: 'distance', value: parseFloat(newDist.toFixed(1)) });
    };

    const handlePointerUp = () => { isDragging.current = false; };

    const inches = distance / 2.54;

    return (
        <div style={{
            pointerEvents: isRunning ? 'auto' : 'none',
            width: BOUNDS.w,
            height: BOUNDS.h,
            position: 'relative',
            overflow: 'visible',
            touchAction: 'none',
            cursor: isRunning ? 'pointer' : 'default'
        }}
             onClick={handleSensorClick}>
            {React.createElement('wokwi-hc-sr04', {
                distance: attrs?.distance || Math.round(distance),
                ...attrs,
                style: {
                    display: 'block',
                    width: nativeW,
                    height: nativeH,
                    transform: `scale(${scaleX}, ${scaleY})`,
                    transformOrigin: '0 0',
                    pointerEvents: 'none'
                }
            })}

            {/* Cone overlay — only shown when showCone is true */}
            {showCone && (
                <svg ref={svgRef} width="100%" height="100%" viewBox={`0 0 ${BOUNDS.w} ${BOUNDS.h}`}
                     style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', userSelect: 'none', touchAction: 'none', pointerEvents: 'none' }}
                     onClick={(e) => e.stopPropagation()}
                     onPointerMove={handleSvgPointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}>
                    {/* Green cone */}
                    <path d={conePath} fill="rgba(210,235,220,0.65)" stroke="rgba(100,180,120,0.4)" strokeWidth="1" pointerEvents="none"/>
                    {/* Tracking lines */}
                    <line x1={xT} y1={yT} x2={xDot} y2={yDot} stroke="#a0bec8" strokeWidth="2" strokeDasharray="6,4" pointerEvents="none"/>
                    <line x1={xR} y1={yR} x2={xDot} y2={yDot} stroke="#a0bec8" strokeWidth="2" strokeDasharray="6,4" pointerEvents="none"/>
                    {/* Dot */}
                    <circle cx={xDot} cy={yDot} r="13" fill="#009ba4" stroke="#005a60" strokeWidth="2"
                            style={{ cursor: 'grab', pointerEvents: 'auto' }} onPointerDown={handleDotPointerDown}
                            onClick={(e) => e.stopPropagation()}/>
                    {/* Distance text */}
                    <text x={x0} y={y0 - 15} textAnchor="middle" fill="#005b8e" fontSize="12" fontWeight="bold"
                          style={{ pointerEvents: 'none', fontFamily: 'sans-serif' }}>
                        {inches.toFixed(1)}in / {distance.toFixed(1)}cm
                    </text>
                </svg>
            )}
        </div>
    );
};
