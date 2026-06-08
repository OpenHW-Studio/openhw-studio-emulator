import React, { useRef, useState, useEffect } from 'react';

// Bounding box for the blue selection ring.
// 120x120 is exactly 8x8 grid cells (15px each).
export const BOUNDS = { x: 0, y: 0, w: 120, h: 120 };

const knobCenter = { x: 9.91, y: 8.18 };

export const PotentiometerUI = ({ state, attrs, isRunning }: { state: any, attrs: any, isRunning: boolean }) => {
    const { value: attrValue, onInteract } = attrs;
    
    // Value from 0 to 100
    const simValue = state?.value ?? attrValue ?? 50;

    const min = 0;
    const max = 100;
    const startDegree = -135;
    const endDegree = 135;

    const percent = Math.max(0, Math.min(1, (simValue - min) / (max - min)));
    const knobDeg = (endDegree - startDegree) * percent + startDegree;

    const svgRef = useRef<SVGSVGElement>(null);
    const isDragging = useRef(false);
    const isActive = useRef(false);
    const [showGlow, setShowGlow] = useState(false);

    useEffect(() => {
        const handleGlobalUp = () => {
            isDragging.current = false;
            if (isActive.current) {
                isActive.current = false;
                setShowGlow(false);
            }
        };
        const handleGlobalMove = (e: PointerEvent) => {
            if (!isActive.current || !isRunning) return;
            if (!isDragging.current) {
                isDragging.current = true;
            }
            updateValueFromEvent(e);
        };
        window.addEventListener('pointerup', handleGlobalUp);
        window.addEventListener('pointercancel', handleGlobalUp);
        window.addEventListener('pointermove', handleGlobalMove);
        return () => {
            window.removeEventListener('pointerup', handleGlobalUp);
            window.removeEventListener('pointercancel', handleGlobalUp);
            window.removeEventListener('pointermove', handleGlobalMove);
        };
    }, [isRunning, onInteract]);

    const updateValueFromEvent = (e: React.PointerEvent | PointerEvent) => {
        if (!svgRef.current) return;

        const rect = svgRef.current.getBoundingClientRect();
        const localX = ((e.clientX - rect.left) / rect.width) * 20;
        const localY = ((e.clientY - rect.top) / rect.height) * 20;

        const x = knobCenter.x - localX;
        const y = knobCenter.y - localY;

        let deg = Math.round((Math.atan2(y, x) * 180) / Math.PI);
        if (deg < 0) deg += 360;
        deg -= 90;

        if (x > 0 && y <= 0 && deg > 0) {
            deg -= 360;
        }

        deg = Math.max(startDegree, Math.min(endDegree, deg));
        const newPercent = (deg - startDegree) / (endDegree - startDegree);
        const newValue = Math.round(newPercent * (max - min) + min);

        if (onInteract) {
            onInteract({ type: 'input', value: newValue });
        }
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!isRunning) return;
        e.stopPropagation();
        e.preventDefault();
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
        // First click activates the glow, dragging starts on first pointer move
        isActive.current = true;
        setShowGlow(true);
    };

    return (
        <div style={{ 
            pointerEvents: isRunning ? 'auto' : 'none',
            width: BOUNDS.w,
            height: BOUNDS.h,
            position: 'relative',
            overflow: 'visible',
            touchAction: 'none'
        }}
        onPointerDown={handlePointerDown}
        >
            <svg
                ref={svgRef}
                width="100%"
                height="100%"
                viewBox="0 0 20 20"
                style={{ fontFamily: 'sans-serif', userSelect: 'none' }}
            >
                <defs>
                    <filter id="knob-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#ffaa00" floodOpacity="0.9" />
                    </filter>
                </defs>
                <rect x=".15" y=".15" width="19.5" height="19.5" rx="1.23" fill="#045881" stroke="#045881" strokeWidth=".30" />
                <rect x="5.4" y=".70" width="9.1" height="1.9" fill="#ccdae3" strokeWidth=".15" />
                
                <ellipse cx={knobCenter.x} cy={knobCenter.y} rx="7.27" ry="7.43" fill={showGlow ? '#f5d580' : '#e4e8eb'} strokeWidth=".15" filter={showGlow ? 'url(#knob-glow)' : undefined} />
                
                {/* Pins and Labels - Shifted to x=7.5, 10, 12.5 to exactly match 15px intervals at scale 6 */}
                <rect x="6" y="17" width="8" height="2" fillOpacity="0" stroke="#fff" strokeWidth=".30" />
                <g strokeWidth=".15" fill="#ffffff" style={{ fontSize: '1px', lineHeight: '1.25' }}>
                    <text x="5.8" y="16.6">GND</text>
                    <text x="8.8" y="16.6">SIG</text>
                    <text x="11.5" y="16.6">VCC</text>
                </g>
                <g fill="#fff" strokeWidth=".15">
                    <ellipse cx="1.68" cy="1.81" rx=".99" ry=".96" />
                    <ellipse cx="1.48" cy="18.37" rx=".99" ry=".96" />
                    <ellipse cx="17.97" cy="18.47" rx=".99" ry=".96" />
                    <ellipse cx="18.07" cy="1.91" rx=".99" ry=".96" />
                </g>
                <g fill="#b3b1b0" strokeWidth=".15">
                    <ellipse cx="7.5" cy="18" rx=".61" ry=".63" />
                    <ellipse cx="10" cy="18" rx=".61" ry=".63" />
                    <ellipse cx="12.5" cy="18" rx=".61" ry=".63" />
                </g>

                {/* Rotating Knob */}
                <g style={{ transformOrigin: `${knobCenter.x}px ${knobCenter.y}px`, transform: `rotate(${knobDeg}deg)` }}>
                    <ellipse cx="9.95" cy="8.06" rx="6.60" ry="6.58" fill="#c3c2c3" strokeWidth=".15" />
                    <rect x="10" y="2" width=".42" height="3.1" strokeWidth=".15" />
                </g>
            </svg>
        </div>
    );
};
