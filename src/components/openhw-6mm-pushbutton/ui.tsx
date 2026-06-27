import React, { useLayoutEffect, useRef, useState } from 'react';

const BTN_COLORS = [
    { label: 'Blue', value: 'blue', primary: '#3b82f6', dark: '#1d4ed8' },
    { label: 'Red', value: 'red', primary: '#ef4444', dark: '#b91c1c' },
    { label: 'Green', value: 'green', primary: '#22c55e', dark: '#15803d' },
    { label: 'Yellow', value: 'yellow', primary: '#eab308', dark: '#a16207' },
    { label: 'White', value: 'white', primary: '#fafafa', dark: '#d4d4d8' },
    { label: 'Black', value: 'black', primary: '#52525b', dark: '#09090b' },
    { label: 'Orange', value: 'orange', primary: '#f97316', dark: '#c2410c' },
];

export const Pushbutton6mmContextMenu = ({ attrs, onUpdate }: { attrs: any, onUpdate: (key: string, value: any) => void }) => {
    const current = attrs?.color ?? 'blue';
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

export const BOUNDS = { x: 0, y: 0, w: 45, h: 60 };

export const Pushbutton6mmUI = ({ state, attrs, isRunning }: { state: any, attrs: any, isRunning: boolean }) => {
    const [isPressed, setIsPressed] = useState(false);
    const isPressedRef = useRef(false);
    const attrsRef = useRef(attrs);

    useLayoutEffect(() => {
        attrsRef.current = attrs;
    });

    const nativeW = 45;
    const nativeH = 60;
    const scaleX = BOUNDS.w / nativeW;
    const scaleY = BOUNDS.h / nativeH;

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

    const pressed = isPressed || state?.pressed;
    const colorAttr = attrs?.color ?? 'blue';
    const btnColor = BTN_COLORS.find(c => c.value === colorAttr) ?? BTN_COLORS[0];

    const uniqueId = state?.id || Math.random().toString(36).substring(2, 9);

    return (
        <div style={{ 
            pointerEvents: 'none', 
            position: 'absolute', 
            inset: 0,
            width: BOUNDS.w,
            height: BOUNDS.h
        }}>
            <div
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
                    transition: 'filter 0.05s',
                    transform: `scale(${scaleX}, ${scaleY})`,
                    transformOrigin: '50% 50%',
                    filter: pressed ? 'brightness(0.9) drop-shadow(0 1px 1px rgba(0,0,0,0.5))' : 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))',
                    cursor: 'pointer',
                    pointerEvents: isRunning ? 'auto' : 'none'
                }}>
                <svg
                    width={nativeW}
                    height={nativeH}
                    viewBox="0 0 45 60"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        <linearGradient id={`grad-up-${uniqueId}`} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0" stopColor="#ffffff" />
                            <stop offset="0.3" stopColor={btnColor.primary} />
                            <stop offset="0.5" stopColor={btnColor.primary} />
                            <stop offset="1" stopColor={btnColor.dark} />
                        </linearGradient>
                        <linearGradient id={`grad-down-${uniqueId}`} x1="1" y1="1" x2="0" y2="0">
                            <stop offset="0" stopColor="#ffffff" />
                            <stop offset="0.3" stopColor={btnColor.primary} />
                            <stop offset="0.5" stopColor={btnColor.primary} />
                            <stop offset="1" stopColor={btnColor.dark} />
                        </linearGradient>
                    </defs>

                    {/* Stamped Metal Legs */}
                    <rect x="0" y="13.5" width="5.5" height="3" rx="0.5" fill="#b3b3b3" />
                    <rect x="0" y="43.5" width="5.5" height="3" rx="0.5" fill="#b3b3b3" />
                    <rect x="39.5" y="13.5" width="5.5" height="3" rx="0.5" fill="#b3b3b3" />
                    <rect x="39.5" y="43.5" width="5.5" height="3" rx="0.5" fill="#b3b3b3" />

                    {/* Breadboard contact pins (invisible functional snap points) */}
                    <circle cx="0" cy="15" r="1.5" fill="#333" opacity="0.3" />
                    <circle cx="0" cy="45" r="1.5" fill="#333" opacity="0.3" />
                    <circle cx="45" cy="15" r="1.5" fill="#333" opacity="0.3" />
                    <circle cx="45" cy="45" r="1.5" fill="#333" opacity="0.3" />

                    {/* Dark Gray Outer Housing */}
                    <rect x="4.5" y="12" width="36" height="36" rx="1.5" fill="#464646" />
                    
                    {/* Metallic Inner Plate */}
                    <rect x="6.75" y="14.25" width="31.5" height="31.5" rx="1" fill="#eaeaea" />

                    {/* Button Plunger */}
                    <circle 
                        cx="22.5" 
                        cy="30" 
                        r="11.5" 
                        fill={pressed ? `url(#grad-down-${uniqueId})` : `url(#grad-up-${uniqueId})`} 
                    />
                    
                    {/* Inner Plunger Ring */}
                    <circle 
                        cx="22.5" 
                        cy="30" 
                        r="8.5" 
                        fill={btnColor.primary} 
                        stroke="#2f2f2f" 
                        strokeOpacity="0.47" 
                        strokeWidth="0.5" 
                    />
                </svg>
            </div>
        </div>
    );
};
