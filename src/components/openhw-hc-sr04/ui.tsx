import React, { useRef, useEffect, useCallback } from 'react';

export const BOUNDS = { x: 0, y: 0, w: 258.75, h: 171 };

export const HCSR04UI = ({ state, attrs, isRunning }: { state: any, attrs: any, isRunning: boolean }) => {
    const { onInteract } = attrs;
    const distance = state?.distance ?? attrs?.distance ?? 100;

    const nativeW = 172.5;
    const nativeH = 114;
    const scaleX = BOUNDS.w / nativeW;
    const scaleY = BOUNDS.h / nativeH;

    const ballRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const startY = useRef(0);
    const startDist = useRef(100);

    const getBallNativeY = useCallback((d: number) => {
        const maxY = 22;
        const minY = 90;
        const clamped = Math.max(0, Math.min(400, d));
        return minY - (clamped / 400) * (minY - maxY);
    }, []);

    const ballNativeY = getBallNativeY(distance);
    const ballScreenX = 65;

    useEffect(() => {
        if (!isRunning) return;

        const handleMove = (e: PointerEvent) => {
            if (!isDragging.current) return;
            const delta = (startY.current - e.clientY) * 1.5;
            const newDist = Math.max(0, Math.min(400, Math.round(startDist.current + delta)));
            if (newDist !== distance && onInteract) {
                onInteract({ type: 'input', value: newDist });
            }
        };

        const handleUp = () => {
            if (isDragging.current) {
                isDragging.current = false;
            }
        };

        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
        window.addEventListener('pointercancel', handleUp);
        return () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
            window.removeEventListener('pointercancel', handleUp);
        };
    }, [isRunning, onInteract, distance]);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!isRunning) return;
        e.stopPropagation();
        e.preventDefault();
        startY.current = e.clientY;
        startDist.current = distance;
        isDragging.current = true;
    };

    const ballPixelY = ballNativeY * scaleY;
    const dashLinePixelY = 145;

    return (
        <div style={{
            width: BOUNDS.w,
            height: BOUNDS.h,
            position: 'relative',
            overflow: 'visible',
            touchAction: 'none',
            pointerEvents: isRunning ? 'auto' : 'none',
        }}>
            <div style={{
                pointerEvents: 'none',
                width: nativeW,
                height: nativeH,
                transform: `scale(${scaleX}, ${scaleY})`,
                transformOrigin: '0 0',
            }}>
                {React.createElement('wokwi-hc-sr04', {
                    distance: distance,
                    ...attrs,
                    style: {
                        display: 'block',
                        width: nativeW,
                        height: nativeH,
                    }
                })}
            </div>

            {isRunning && (
                <>
                    <div style={{
                        position: 'absolute',
                        left: ballScreenX * scaleX - 1,
                        top: dashLinePixelY,
                        width: 2,
                        height: ballPixelY - dashLinePixelY,
                        background: '#ffaa00',
                        opacity: 0.4,
                        pointerEvents: 'none',
                    }} />
                    <div
                        ref={ballRef}
                        onPointerDown={handlePointerDown}
                        style={{
                            position: 'absolute',
                            left: ballScreenX * scaleX - 14,
                            top: ballPixelY - 14,
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: '#ffaa00',
                            border: '2px solid #fff',
                            cursor: 'ns-resize',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            userSelect: 'none',
                            touchAction: 'none',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                        }}
                    >
                        <span style={{
                            color: '#000',
                            fontSize: 10,
                            fontFamily: 'monospace',
                            fontWeight: 'bold',
                            pointerEvents: 'none',
                            lineHeight: 1,
                        }}>
                            {distance}
                        </span>
                    </div>
                    <div style={{
                        position: 'absolute',
                        left: ballScreenX * scaleX - 30,
                        top: ballPixelY - 32,
                        color: '#ffaa00',
                        fontSize: 10,
                        fontFamily: 'monospace',
                        fontWeight: 'bold',
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap',
                        textAlign: 'center',
                        width: 60,
                    }}>
                        {distance} cm
                    </div>
                </>
            )}
        </div>
    );
};
