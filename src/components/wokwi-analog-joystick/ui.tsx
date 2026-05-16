import React, { useState, useRef } from 'react';

// Bounding box for the blue selection ring.
export const BOUNDS = { x: 0, y: 0, w: 84, h: 84 };

export const JoystickUI = ({ state, attrs, isRunning, comp }: { state: any, attrs: any, isRunning: boolean, comp?: any }) => {
    const handleRef = useRef<SVGCircleElement>(null);
    const [localState, setLocalState] = useState({ x: 0.5, y: 0.5, pressed: false });

    // Use simulated state if running, else local component state
    // Prioritize local state during active dragging for instantaneous UI feedback without worker lag!
    const isDraggingRef = useRef(false);
    const isArrowHoldingRef = useRef(false);
    const currentX = isDraggingRef.current || isArrowHoldingRef.current ? localState.x : (isRunning && state?.x !== undefined ? state.x : localState.x);
    const currentY = isDraggingRef.current || isArrowHoldingRef.current ? localState.y : (isRunning && state?.y !== undefined ? state.y : localState.y);
    const isPressed = isDraggingRef.current || isArrowHoldingRef.current ? localState.pressed : (isRunning && state?.pressed !== undefined ? state.pressed : localState.pressed);

    // Map 0..1 to UI coordinates
    // Center is 30,30. Movement radius is ~15.

    const nativeW = 84;
    const nativeH = 84;

    const updatePosition = (e: React.PointerEvent) => {
        const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
        let nx = (e.clientX - rect.left) / rect.width;
        let ny = (e.clientY - rect.top) / rect.height;

        // Clamp to 0..1
        nx = Math.max(0, Math.min(1, nx));
        ny = Math.max(0, Math.min(1, ny));

        if (attrs.onInteract) attrs.onInteract({ type: 'move', x: nx, y: ny });
        setLocalState((prev: any) => ({ ...prev, x: nx, y: ny }));
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!isRunning) return;
        e.stopPropagation();
        try { if ('pointerId' in e) (e.target as any).setPointerCapture(e.pointerId); } catch (err) { }

        if (e.button === 2 || e.shiftKey) {
            // Right click or Shift + click = press button
            if (attrs.onInteract) attrs.onInteract('press');
            setLocalState((prev: any) => ({ ...prev, pressed: true }));
        } else {
            // Calculate new X/Y immediately on click
            isDraggingRef.current = true;
            updatePosition(e);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isRunning) return;
        if (isArrowHoldingRef.current) return; // Ignore drag updates if holding an arrow
        if (!isDraggingRef.current) return;
        if (isPressed && !e.shiftKey && e.button !== 2) return; // If pressed and moving, just update position too
        updatePosition(e);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isRunning) return;
        e.stopPropagation();
        try { if ('pointerId' in e) (e.target as any).releasePointerCapture((e as React.PointerEvent).pointerId); } catch (err) { }
        isDraggingRef.current = false;

        // On release, joystick snaps back to center
        if (attrs.onInteract) {
            attrs.onInteract({ type: 'move', x: 0.5, y: 0.5 });
            if (isPressed) attrs.onInteract('release');
        }
        setLocalState({ x: 0.5, y: 0.5, pressed: false });
    };

    const handleArrowDown = (e: React.PointerEvent | React.MouseEvent, nx: number, ny: number) => {
        if (!isRunning) return;
        e.stopPropagation();
        try { if ('pointerId' in e) (e.target as any).setPointerCapture((e as React.PointerEvent).pointerId); } catch (err) { }

        isArrowHoldingRef.current = true;
        if (attrs.onInteract) attrs.onInteract({ type: 'move', x: nx, y: ny });
        setLocalState((prev: any) => ({ ...prev, x: nx, y: ny }));
    };

    const handleArrowUp = (e: React.PointerEvent | React.MouseEvent) => {
        if (!isRunning) return;
        e.stopPropagation();
        try { if ('pointerId' in e) (e.target as any).releasePointerCapture((e as React.PointerEvent).pointerId); } catch (err) { }

        isArrowHoldingRef.current = false;
        if (attrs.onInteract) attrs.onInteract({ type: 'move', x: 0.5, y: 0.5 });
        setLocalState((prev: any) => ({ ...prev, x: 0.5, y: 0.5 }));
    };

    const Arrow = ({ d, nx, ny, hx, hy, hw, hh }: { d: string, nx: number, ny: number, hx: number, hy: number, hw: number, hh: number }) => (
        <g>
            <rect
                x={hx} y={hy} width={hw} height={hh}
                fill="#ffffff" opacity={0.01} stroke="none"
                style={{ cursor: isRunning ? 'pointer' : 'default', pointerEvents: 'all' }}
                onPointerDown={(e: React.PointerEvent) => handleArrowDown(e, nx, ny)}
                onPointerUp={handleArrowUp}
                onPointerCancel={handleArrowUp}
                onPointerLeave={(e: React.PointerEvent) => {
                    if (isArrowHoldingRef.current && (e.target as any).hasPointerCapture && (e.target as any).hasPointerCapture(e.pointerId)) {
                        // Do nothing if it captured
                    } else if (!isArrowHoldingRef.current) {
                        // Do nothing
                    } else {
                        handleArrowUp(e)
                    }
                }}
                onMouseDown={e => {
                    if (isRunning) e.stopPropagation();
                }}
            />
            <path
                d={d}
                fill="#7f8c8d"
                stroke="#2c3e50"
                strokeWidth={0.5}
                style={{ opacity: 0.6, pointerEvents: 'none' }}
            />
        </g>
    );

    // Map 0..1 to UI coordinates
    // Center is 42,42. Movement radius is ~20.
    const cx = 42 + (currentX - 0.5) * 42;
    const cy = 42 + (currentY - 0.5) * 42;

    return (
        <div style={{
            width: BOUNDS.w,
            height: BOUNDS.h,
            pointerEvents: 'none',
            position: 'relative'
        }}>
            <svg
                width={nativeW}
                height={nativeH}
                viewBox="0 0 84 84"
                style={{ 
                    display: 'block', 
                    overflow: 'visible', 
                    cursor: isRunning ? 'pointer' : 'default', 
                    pointerEvents: isRunning ? 'auto' : 'none',
                    touchAction: 'none'
                }}
                onMouseDown={e => isRunning && e.stopPropagation()}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onContextMenu={e => { if (isRunning) e.preventDefault(); }} // Prevent context menu if running
            >
            {/* Base */}
            <rect x={2} y={2} width={80} height={80} rx={12} fill="#2c3e50" stroke="#1a252f" strokeWidth={2} />
            <circle cx={42} cy={42} r={32} fill="#34495e" stroke="#2c3e50" strokeWidth={2} />

            {/* D-Pad Arrows with large hitboxes */}
            <Arrow d="M 38 20 L 42 12 L 46 20 Z" nx={0.5} ny={0.0} hx={30} hy={8} hw={24} hh={14} />
            <Arrow d="M 38 64 L 42 72 L 46 64 Z" nx={0.5} ny={1.0} hx={30} hy={60} hw={24} hh={14} />
            <Arrow d="M 20 38 L 12 42 L 20 46 Z" nx={0.0} ny={0.5} hx={8} hy={30} hw={14} hh={24} />
            <Arrow d="M 64 38 L 72 42 L 64 46 Z" nx={1.0} ny={0.5} hx={60} hy={30} hw={14} hh={24} />

            {/* Pins at 10, 25, 40, 55, 70 matching manifest */}
            {[10, 25, 40, 55, 70].map((px, i) => (
                <g key={i}>
                    <line x1={px} y1={80} x2={px} y2={84} stroke="#f1c40f" strokeWidth={2} />
                    <circle cx={px} cy={84} r={1.5} fill="#f1c40f" />
                </g>
            ))}
            <text x={10} y={78} fontSize={4} fill="#ecf0f1" textAnchor="middle">GND</text>
            <text x={25} y={78} fontSize={4} fill="#ecf0f1" textAnchor="middle">5V</text>
            <text x={40} y={78} fontSize={4} fill="#ecf0f1" textAnchor="middle">VRX</text>
            <text x={55} y={78} fontSize={4} fill="#ecf0f1" textAnchor="middle">VRY</text>
            <text x={70} y={78} fontSize={4} fill="#ecf0f1" textAnchor="middle">SW</text>

            {/* Handle / Stick */}
            <circle
                ref={handleRef}
                cx={cx}
                cy={cy}
                r={18}
                fill={isPressed ? "#c0392b" : "#e74c3c"}
                stroke="#c0392b"
                strokeWidth={2}
                style={{
                    transition: (currentX === 0.5 && currentY === 0.5) ? 'all 0.15s ease-out' : 'none'
                }}
            />
            {/* Inner shading for the stick */}
            <circle cx={cx - 4} cy={cy - 4} r={6} fill="#ffffff" opacity={0.3} style={{ pointerEvents: 'none' }} />
        </svg>
    </div>
    );
};
