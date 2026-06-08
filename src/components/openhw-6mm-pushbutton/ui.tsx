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

export const BOUNDS = { x: 0, y: 0, w: 60, h: 45 };

export const Pushbutton6mmUI = ({ state, attrs, isRunning }: { state: any, attrs: any, isRunning: boolean }) => {
    const [isPressed, setIsPressed] = useState(false);
    const isPressedRef = useRef(false);
    const attrsRef = useRef(attrs);

    useLayoutEffect(() => {
        attrsRef.current = attrs;
    });

    const nativeW = 60;
    const nativeH = 45;
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
                    transition: 'transform 0.05s ease, filter 0.05s',
                    transform: `scale(${scaleX}, ${scaleY}) ${pressed ? 'scale(0.94)' : ''}`,
                    transformOrigin: '50% 50%',
                    filter: pressed ? 'brightness(0.85) drop-shadow(0 1px 2px rgba(0,0,0,0.4))' : 'drop-shadow(0 3px 4px rgba(0,0,0,0.25))',
                    cursor: 'pointer',
                    pointerEvents: isRunning ? 'auto' : 'none'
                }}>
                <svg
                    width={nativeW}
                    height={nativeH}
                    viewBox="0 0 60 45"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        <linearGradient id={`base-grad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#2c2c2e" />
                            <stop offset="100%" stopColor="#121212" />
                        </linearGradient>
                        <linearGradient id={`metal-grad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#f3f4f6" />
                            <stop offset="50%" stopColor="#e5e7eb" />
                            <stop offset="100%" stopColor="#9ca3af" />
                        </linearGradient>
                        <linearGradient id={`leg-grad-${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#d1d5db" />
                            <stop offset="100%" stopColor="#9ca3af" />
                        </linearGradient>
                        <radialGradient id={`plunger-grad-${uniqueId}`} cx="60%" cy="40%" r="60%">
                            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                            <stop offset="25%" stopColor={btnColor.primary} />
                            <stop offset="100%" stopColor={btnColor.dark} />
                        </radialGradient>
                    </defs>

                    <path d="M 45 5.5 V 3 Q 45 0 43 0" stroke={`url(#leg-grad-${uniqueId})`} strokeWidth="3" strokeLinecap="round" fill="none" />
                    <path d="M 15 5.5 V 3 Q 15 0 17 0" stroke={`url(#leg-grad-${uniqueId})`} strokeWidth="3" strokeLinecap="round" fill="none" />

                    <path d="M 45 39.5 V 45 Q 45 45 43 45" stroke={`url(#leg-grad-${uniqueId})`} strokeWidth="3" strokeLinecap="round" fill="none" />
                    <path d="M 15 39.5 V 45 Q 15 45 17 45" stroke={`url(#leg-grad-${uniqueId})`} strokeWidth="3" strokeLinecap="round" fill="none" />

                    <circle cx="45" cy="0" r="1.5" fill="#9ca3af" />
                    <circle cx="15" cy="0" r="1.5" fill="#9ca3af" />
                    <circle cx="45" cy="45" r="1.5" fill="#9ca3af" />
                    <circle cx="15" cy="45" r="1.5" fill="#9ca3af" />

                    <rect x="10" y="4.5" width="40" height="36" rx="3" fill={`url(#base-grad-${uniqueId})`} stroke="#000000" strokeWidth="0.8" />
                    <rect x="13" y="7.5" width="34" height="30" rx="2" fill={`url(#metal-grad-${uniqueId})`} stroke="#4b5563" strokeWidth="0.6" />

                    <circle cx="44.5" cy="10" r="1" fill="#1f2937" />
                    <circle cx="44.5" cy="35" r="1" fill="#1f2937" />
                    <circle cx="15.5" cy="10" r="1" fill="#1f2937" />
                    <circle cx="15.5" cy="35" r="1" fill="#1f2937" />

                    <circle cx="30" cy="22.5" r="11" fill="#1f2937" opacity="0.15" />
                    <circle cx="30" cy="22.5" r="10" fill="#4b5563" stroke="#374151" strokeWidth="0.5" />
                    <circle cx="30" cy="22.5" r="8.5" fill={`url(#plunger-grad-${uniqueId})`} stroke="#1f2937" strokeWidth="0.5" />
                </svg>
            </div>
        </div>
    );
};