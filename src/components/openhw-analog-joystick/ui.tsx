import React, { useState, useRef } from 'react';

// Bounding box scaled by ~3.78 to match Wokwi visual size from 27.2x31.8 SVG
export const BOUNDS = { x: 0, y: 0, w: 237.4, h: 277.5 };

export const JoystickUI = ({ state, attrs, isRunning, comp }: { state: any, attrs: any, isRunning: boolean, comp?: any }) => {
    const [localState, setLocalState] = useState({ x: 0.5, y: 0.5, pressed: false });

    // Use simulated state if running, else local component state
    // Prioritize local state during active dragging for instantaneous UI feedback without worker lag!
    const isDraggingRef = useRef(false);
    const isArrowHoldingRef = useRef(false);
    const currentX = isDraggingRef.current || isArrowHoldingRef.current ? localState.x : (isRunning && state?.x !== undefined ? state.x : localState.x);
    const currentY = isDraggingRef.current || isArrowHoldingRef.current ? localState.y : (isRunning && state?.y !== undefined ? state.y : localState.y);
    const isPressed = isDraggingRef.current || isArrowHoldingRef.current ? localState.pressed : (isRunning && state?.pressed !== undefined ? state.pressed : localState.pressed);

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

    // Calculate translation for the knob. Wokwi maps -1 to 1 value to translation of 2.5
    // our currentX/currentY is 0 to 1, where 0 is left/top, 1 is right/bottom.
    // So dx = (currentX - 0.5) * 5 (which maps to -2.5 to 2.5)
    const dx = (currentX - 0.5) * 5;
    const dy = (currentY - 0.5) * 5;

    return (
        <div style={{
            width: BOUNDS.w,
            height: BOUNDS.h,
            pointerEvents: 'none',
            position: 'relative'
        }}>
            <svg
                width="100%"
                height="100%"
                viewBox="0 0 27.2 31.8"
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
                <defs>
                    <filter id={`noise-${comp?.id || 'default'}`} primitiveUnits="objectBoundingBox">
                        <feTurbulence baseFrequency="2 2" type="fractalNoise" />
                        <feColorMatrix
                            values=".1 0 0 0 .1
                                    .1 0 0 0 .1
                                    .1 0 0 0 .1
                                    0 0 0 0 1"
                        />
                        <feComposite in2="SourceGraphic" operator="lighter" />
                        <feComposite result="body" in2="SourceAlpha" operator="in" />
                    </filter>
                    <radialGradient id={`g-knob-${comp?.id || 'default'}`} cx="13.6" cy="13.6" r="10.6" gradientUnits="userSpaceOnUse">
                        <stop offset="0" />
                        <stop offset="0.9" />
                        <stop stopColor="#777" offset="1" />
                    </radialGradient>
                    <radialGradient
                        id={`g-knob-base-${comp?.id || 'default'}`}
                        cx="13.6"
                        cy="13.6"
                        r="13.6"
                        gradientUnits="userSpaceOnUse"
                    >
                        <stop offset="0" />
                        <stop stopColor="#444" offset=".8" />
                        <stop stopColor="#555" offset=".9" />
                        <stop offset="1" />
                    </radialGradient>
                    <path
                        id={`pin-${comp?.id || 'default'}`}
                        fill="silver"
                        stroke="#a2a2a2"
                        strokeWidth=".024"
                        d="M8.726 29.801a.828.828 0 00-.828.829.828.828 0 00.828.828.828.828 0 00.829-.828.828.828 0 00-.829-.829zm-.004.34a.49.49 0 01.004 0 .49.49 0 01.49.489.49.49 0 01-.49.49.49.49 0 01-.489-.49.49.49 0 01.485-.49z"
                    />
                </defs>
                <path
                    d="M1.3 0v31.7h25.5V0zm2.33.683a1.87 1.87 0 01.009 0 1.87 1.87 0 011.87 1.87 1.87 1.87 0 01-1.87 1.87 1.87 1.87 0 01-1.87-1.87 1.87 1.87 0 011.87-1.87zm20.5 0a1.87 1.87 0 01.009 0 1.87 1.87 0 011.87 1.87 1.87 1.87 0 01-1.87 1.87 1.87 1.87 0 01-1.87-1.87 1.87 1.87 0 011.87-1.87zm-20.5 26.8a1.87 1.87 0 01.009 0 1.87 1.87 0 011.87 1.87 1.87 1.87 0 01-1.87 1.87 1.87 1.87 0 01-1.87-1.87 1.87 1.87 0 011.87-1.87zm20.4 0a1.87 1.87 0 01.009 0 1.87 1.87 0 011.87 1.87 1.87 1.87 0 01-1.87 1.87 1.87 1.87 0 01-1.87-1.87 1.87 1.87 0 011.87-1.87zm-12.7 2.66a.489.489 0 01.004 0 .489.489 0 01.489.489.489.489 0 01-.489.489.489.489 0 01-.489-.489.489.489 0 01.485-.489zm2.57 0a.489.489 0 01.004 0 .489.489 0 01.489.489.489.489 0 01-.489.489.489.489 0 01-.489-.489.489.489 0 01.485-.489zm2.49.013a.489.489 0 01.004 0 .489.489 0 01.489.489.489.489 0 01-.489.489.489.489 0 01-.489-.489.489.489 0 01.485-.489zm-7.62.007a.489.489 0 01.004 0 .489.489 0 01.489.489.489.489 0 01-.489.489.489.489 0 01-.489-.49.489.489 0 01.485-.488zm10.2.013a.489.489 0 01.004 0 .489.489 0 01.489.489.489.489 0 01-.489.489.489.489 0 01-.489-.49.489.489 0 01.485-.488z"
                    fill="#bd1e34"
                />
                <g fill="#fff" fontFamily="sans-serif" strokeWidth=".03">
                    <text textAnchor="middle" fontSize="1.2" letterSpacing=".053">
                        <tspan x="4.034" y="25.643">Analog</tspan>
                        <tspan x="4.061" y="27.159">Joystick</tspan>
                    </text>
                    <text transform="rotate(-90)" textAnchor="start" fontSize="1.2">
                        <tspan x="-29.2" y="9.2">VCC</tspan>
                        <tspan x="-29.2" y="11.74">VERT</tspan>
                        <tspan x="-29.2" y="14.28">HORZ</tspan>
                        <tspan x="-29.2" y="16.82">SEL</tspan>
                        <tspan x="-29.2" y="19.36">GND</tspan>
                    </text>
                </g>
                <ellipse cx="13.6" cy="13.7" rx="13.6" ry="13.7" fill={`url(#g-knob-base-${comp?.id || 'default'})`} />
                <path
                    d="M48.2 65.5s.042.179-.093.204c-.094.017-.246-.077-.322-.17-.094-.115-.082-.205-.009-.285.11-.122.299-.075.299-.075s-.345-.303-.705-.054c-.32.22-.228.52.06.783.262.237.053.497-.21.463-.18-.023-.252-.167-.21-.256.038-.076.167-.122.167-.122s-.149-.06-.324.005c-.157.06-.286.19-.276.513v1.51s.162-.2.352-.403c.214-.229.311-.384.53-.366.415.026.714-.159.918-.454.391-.569.085-1.2-.178-1.29"
                    fill="#fff"
                />
                
                {/* Visual Feedback for press (scale down slightly) and drag (translate dx, dy) */}
                <g transform={`translate(${dx}, ${dy}) scale(${isPressed ? 0.95 : 1})`} style={{ transformOrigin: '13.6px 13.6px' }}>
                    <circle
                        cx="13.6"
                        cy="13.6"
                        r="10.6"
                        fill={`url(#g-knob-${comp?.id || 'default'})`}
                        filter={`url(#noise-${comp?.id || 'default'})`}
                    />
                    {isPressed && (
                        <circle cx="13.6" cy="13.6" r="10.6" fill="#fff" opacity="0.1" pointerEvents="none" />
                    )}
                </g>

                <g fill="none" stroke="#fff" strokeWidth=".142">
                    <path
                        d="M7.8 31.7l-.383-.351v-1.31l.617-.656h1.19l.721.656.675-.656h1.18l.708.656.662-.656h1.25l.643.656.63-.656h1.21l.695.656.636-.656h1.17l.753.656v1.3l-.416.39"
                    />
                    <path
                        d="M9.5 31.7l.381-.344.381.331M12.1 31.7l.381-.344.381.331M14.7 31.7l.381-.344.381.331M17.2 31.7l.381-.344.381.331"
                        strokeLinecap="square"
                        strokeLinejoin="bevel"
                    />
                </g>

                <use href={`#pin-${comp?.id || 'default'}`} x="0" />
                <use href={`#pin-${comp?.id || 'default'}`} x="2.54" />
                <use href={`#pin-${comp?.id || 'default'}`} x="5.08" />
                <use href={`#pin-${comp?.id || 'default'}`} x="7.62" />
                <use href={`#pin-${comp?.id || 'default'}`} x="10.16" />
            </svg>
        </div>
    );
};
