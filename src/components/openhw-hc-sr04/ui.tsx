import React, { useRef, useState, useEffect } from 'react';

// Bounding box for the selection area
export const BOUNDS = { x: 0, y: 0, w: 258.75, h: 171 };

export const HCSR04UI = ({ state, attrs, isRunning }: { state: any, attrs: any, isRunning: boolean }) => {
    const { onInteract } = attrs;
    const distance = state?.distance ?? attrs?.distance ?? 100;

    const nativeW = 172.5;
    const nativeH = 114;
    const scaleX = BOUNDS.w / nativeW;
    const scaleY = BOUNDS.h / nativeH;

    const isDragging = useRef(false);
    const startY = useRef(0);
    const startDist = useRef(100);
    const [showOverlay, setShowOverlay] = useState(false);

    // Register global pointer handlers only when overlay is open
    useEffect(() => {
        if (!showOverlay || !isRunning) return;

        const handleMove = (e: PointerEvent) => {
            if (!isDragging.current) {
                isDragging.current = true;
                startY.current = e.clientY;
                startDist.current = distance;
            }
            const delta = (startY.current - e.clientY) * 0.5;
            const newDist = Math.max(0, Math.min(400, Math.round(startDist.current + delta)));
            if (newDist !== distance && onInteract) {
                onInteract({ type: 'input', value: newDist });
            }
        };

        const handleUp = () => {
            isDragging.current = false;
        };

        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
        window.addEventListener('pointercancel', handleUp);
        return () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
            window.removeEventListener('pointercancel', handleUp);
        };
    }, [showOverlay, isRunning, onInteract, distance]);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!isRunning) return;
        e.stopPropagation();
        e.preventDefault();
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
        setShowOverlay(true);
    };

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setShowOverlay(false);
    };

    const overlayW = 320;
    const overlayX = (BOUNDS.w - overlayW) / 2;
    const overlayY = -56;

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
            {React.createElement('wokwi-hc-sr04', {
                distance: attrs?.distance || 100,
                ...attrs,
                style: {
                    display: 'block',
                    width: nativeW,
                    height: nativeH,
                    transform: `scale(${scaleX}, ${scaleY})`,
                    transformOrigin: '0 0'
                }
            })}
            {showOverlay && (
                <div style={{
                    position: 'absolute',
                    left: overlayX,
                    top: overlayY,
                    width: overlayW,
                    pointerEvents: 'none',
                    userSelect: 'none',
                }}>
                    <div style={{
                        background: 'rgba(0,0,0,0.85)',
                        border: '1.5px solid #ffaa00',
                        borderRadius: 8,
                        padding: '8px 28px 8px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        position: 'relative',
                    }}>
                        <div style={{
                            color: '#ffaa00',
                            fontSize: 10,
                            fontFamily: 'monospace',
                            fontWeight: 'bold',
                            textAlign: 'center',
                            lineHeight: 1.4,
                        }}>
                            Editing Ultrasonic Distance Sensor
                        </div>
                        <div style={{
                            color: '#fff',
                            fontSize: 11,
                            fontFamily: 'monospace',
                            textAlign: 'center',
                            lineHeight: 1.4,
                        }}>
                            Distance: {distance} cm (0 – 400)
                        </div>
                        {/* Close button */}
                        <div
                            onPointerDown={(e) => { e.stopPropagation(); }}
                            onClick={handleClose}
                            style={{
                                position: 'absolute',
                                right: 4,
                                top: 4,
                                width: 18,
                                height: 18,
                                borderRadius: '50%',
                                background: '#ffaa00',
                                color: '#000',
                                fontSize: 12,
                                fontFamily: 'monospace',
                                fontWeight: 'bold',
                                lineHeight: '18px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                pointerEvents: 'auto',
                                userSelect: 'none',
                            }}
                            title="Close"
                        >
                            ✕
                        </div>
                        {/* Drag hint */}
                        <div style={{
                            color: '#aaa',
                            fontSize: 9,
                            fontFamily: 'monospace',
                            textAlign: 'center',
                            lineHeight: 1.2,
                            marginTop: 1,
                        }}>
                            drag up/down to change distance
                        </div>
                    </div>
                    {/* Arrow pointing down to the sensor */}
                    <div style={{
                        width: 0,
                        height: 0,
                        borderLeft: '8px solid transparent',
                        borderRight: '8px solid transparent',
                        borderTop: '8px solid #ffaa00',
                        margin: '0 auto',
                    }} />
                </div>
            )}
        </div>
    );
};
