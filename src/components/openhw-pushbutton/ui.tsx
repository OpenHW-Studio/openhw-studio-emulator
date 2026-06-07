import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';

const BTN_COLORS = [
    { label: 'Green', value: 'green', hex: '#22c55e' },
    { label: 'Red', value: 'red', hex: '#ef4444' },
    { label: 'Blue', value: 'blue', hex: '#3b82f6' },
    { label: 'Yellow', value: 'yellow', hex: '#eab308' },
    { label: 'White', value: 'white', hex: '#f1f5f9' },
    { label: 'Black', value: 'black', hex: '#1e293b' },
];

export const PushbuttonContextMenu = ({ attrs, onUpdate }: { attrs: any, onUpdate: (key: string, value: any) => void }) => {
    const current = attrs?.color ?? 'green';
    return (
        <>
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>Button Color:</span>
            <select
                value={current}
                onChange={e => onUpdate('color', e.target.value)}
                style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: 2, outline: 'none' }}
            >
                {BTN_COLORS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                ))}
            </select>
        </>
    );
};

export const BOUNDS = { x: 0, y: 0, w: 75, h: 60 };

export const PushbuttonUI = ({ state, attrs, isRunning }: { state: any, attrs: any, isRunning: boolean }) => {
    // Local animation state for immediate feedback
    const [isPressed, setIsPressed] = useState(false);
    const isPressedRef = useRef(false);
    const attrsRef = useRef(attrs);

    useLayoutEffect(() => { attrsRef.current = attrs; });

    const nativeW = 75;
    const nativeH = 60;
    const scaleX = BOUNDS.w / nativeW;
    const scaleY = BOUNDS.h / nativeH;

    const colorAttr = attrs?.color || 'green';
    const btnColor = BTN_COLORS.find(c => c.value === colorAttr) ?? BTN_COLORS[0];
    const targetKey = attrs?.key;

    // Use local state as the primary source of truth for user interaction.
    const pressed = isPressed || state?.pressed;

    // Stable deduplicated handlers for press and release
    const handlePress = () => {
        if (isPressedRef.current) return;
        isPressedRef.current = true;
        setIsPressed(true);
        if (attrsRef.current?.onInteract) attrsRef.current.onInteract('press');
    };

    const handleRelease = () => {
        if (!isPressedRef.current) return;
        isPressedRef.current = false;
        setIsPressed(false);
        if (attrsRef.current?.onInteract) attrsRef.current.onInteract('release');
    };

    // Window keyboard listeners for robust key interactivity
    useEffect(() => {
        if (!isRunning || !targetKey) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.repeat) return;
            const k = e.key;
            const t = String(targetKey);
            let match = false;
            if (k.toLowerCase() === t.toLowerCase()) match = true;
            else if (t.toLowerCase() === 'space' && k === ' ') match = true;

            if (match) handlePress();
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const k = e.key;
            const t = String(targetKey);
            let match = false;
            if (k.toLowerCase() === t.toLowerCase()) match = true;
            else if (t.toLowerCase() === 'space' && k === ' ') match = true;

            if (match) handleRelease();
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isRunning, targetKey]);

    const uniqueId = state?.id || Math.random().toString(36).substring(2, 9);
    const buttonFill = pressed ? `url(#grad-down-${uniqueId})` : `url(#grad-up-${uniqueId})`;

    return (
        <div style={{ 
            pointerEvents: 'none', 
            position: 'absolute', 
            inset: 0,
            width: BOUNDS.w,
            height: BOUNDS.h
        }}>
            <div
                className={`btn-wrapper ${pressed ? 'pressed' : ''}`}
                onPointerDown={(e) => {
                    e.stopPropagation();
                    if (e.currentTarget.setPointerCapture) {
                        e.currentTarget.setPointerCapture(e.pointerId);
                    }
                    handlePress();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => {
                    e.stopPropagation();
                    handleRelease();
                }}
                onPointerCancel={(e) => {
                    e.stopPropagation();
                    handleRelease();
                }}
                onLostPointerCapture={handleRelease}
                style={{
                    position: 'relative',
                    width: nativeW,
                    height: nativeH,
                    transform: `scale(${scaleX}, ${scaleY})`,
                    transformOrigin: '50% 50%',
                    cursor: 'pointer',
                    pointerEvents: isRunning ? 'auto' : 'none'
                }}>
                <svg
                    width={nativeW}
                    height={nativeH}
                    viewBox="0 0 75 60"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        <linearGradient id={`grad-up-${uniqueId}`} x1="0" x2="1" y1="0" y2="1">
                            <stop stopColor="#ffffff" offset="0" />
                            <stop stopColor={btnColor.hex} offset="0.3" />
                            <stop stopColor={btnColor.hex} offset="0.5" />
                            <stop offset="1" stopColor="#000000" stopOpacity="0.5" />
                        </linearGradient>
                        <linearGradient id={`grad-down-${uniqueId}`} x1="1" x2="0" y1="1" y2="0">
                            <stop stopColor="#ffffff" offset="0" />
                            <stop stopColor={btnColor.hex} offset="0.3" />
                            <stop stopColor={btnColor.hex} offset="0.5" />
                            <stop offset="1" stopColor="#000000" stopOpacity="0.5" />
                        </linearGradient>
                    </defs>

                    {/* Metal Legs */}
                    <g fill="#999">
                        {/* Left Top (y=15) */}
                        <rect x="12" y="11.5" width="1.5" height="7" />
                        <rect x="0" y="14" width="12.5" height="2" rx="0.5" />
                        
                        {/* Left Bottom (y=45) */}
                        <rect x="12" y="41.5" width="1.5" height="7" />
                        <rect x="0" y="44" width="12.5" height="2" rx="0.5" />

                        {/* Right Top (y=15) */}
                        <rect x="61.5" y="11.5" width="1.5" height="7" />
                        <rect x="62.5" y="14" width="12.5" height="2" rx="0.5" />

                        {/* Right Bottom (y=45) */}
                        <rect x="61.5" y="41.5" width="1.5" height="7" />
                        <rect x="62.5" y="44" width="12.5" height="2" rx="0.5" />
                    </g>

                    {/* Main Metal Body (48x48 centered in 75x60) */}
                    <rect x="13.5" y="6" width="48" height="48" rx="1.76" ry="1.76" fill="#464646" />
                    <rect x="16.5" y="9" width="42" height="42" rx="0.84" ry="0.84" fill="#eaeaea" />

                    {/* Corner Rivets */}
                    <g fill="#1b1b1b">
                        <circle cx="20.5" cy="13.1" r="1.48" />
                        <circle cx="54.1" cy="13.1" r="1.48" />
                        <circle cx="54.1" cy="46.7" r="1.48" />
                        <circle cx="20.5" cy="46.7" r="1.48" />
                    </g>

                    {/* Plunger */}
                    <g>
                        {/* Outer gradient ring */}
                        <circle cx="37.5" cy="30" r="15.28" fill={buttonFill} />
                        
                        {/* Inner colored circle */}
                        <circle 
                            cx="37.5" 
                            cy="30" 
                            r="11.6" 
                            fill={btnColor.hex} 
                            stroke="#2f2f2f" 
                            strokeOpacity="0.47" 
                            strokeWidth="0.32" 
                        />
                    </g>
                </svg>
            </div>
        </div>
    );
};
