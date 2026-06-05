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

// Aligned to breadboard: Width 68, Height 135 (bridges Row E to Row F)
export const BOUNDS = { x: 0, y: 0, w: 68, h: 135 };

export const PushbuttonUI = ({ state, attrs, isRunning }: { state: any, attrs: any, isRunning: boolean }) => {
    const [buttonElement, setButtonElement] = useState<any>(null);
    const [isPressed, setIsPressed] = useState(false);
    const isPressedRef = useRef(false);
    const attrsRef = useRef(attrs);

    useLayoutEffect(() => { attrsRef.current = attrs; });

    const nativeW = 68;
    const nativeH = 135;
    const color = attrs?.color || 'green';
    const targetKey = attrs?.key;

    const darken = (hex: string, amount = 0.12) => {
        const h = hex.replace('#', '');
        const num = parseInt(h, 16);
        let r = (num >> 16) & 0xff, g = (num >> 8) & 0xff, b = num & 0xff;
        r = Math.max(0, Math.min(255, Math.floor(r * (1 - amount))));
        g = Math.max(0, Math.min(255, Math.floor(g * (1 - amount))));
        b = Math.max(0, Math.min(255, Math.floor(b * (1 - amount))));
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    };

    const handlePress = (source: string) => {
        if (isPressedRef.current) return;
        isPressedRef.current = true;
        setIsPressed(true);
        if (attrsRef.current?.onInteract) attrsRef.current.onInteract('press');
    };

    const handleRelease = (source: string) => {
        if (!isPressedRef.current) return;
        isPressedRef.current = false;
        setIsPressed(false);
        if (attrsRef.current?.onInteract) attrsRef.current.onInteract('release');
    };

    useEffect(() => {
        if (!buttonElement) return;
        const onBtnPress = () => handlePress('button-press');
        const onBtnRelease = () => handleRelease('button-release');
        buttonElement.addEventListener('button-press', onBtnPress);
        buttonElement.addEventListener('button-release', onBtnRelease);
        return () => {
            buttonElement.removeEventListener('button-press', onBtnPress);
            buttonElement.removeEventListener('button-release', onBtnRelease);
        };
    }, [buttonElement]);

    return (
        <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0, width: BOUNDS.w, height: BOUNDS.h }}>
            <div style={{ position: 'relative', width: nativeW, height: nativeH, cursor: isRunning ? 'pointer' : 'default', pointerEvents: isRunning ? 'auto' : 'none' }}>
                <wokwi-pushbutton ref={setButtonElement} style={{ display: 'none' }} />
                
                <svg width={nativeW} height={nativeH} viewBox={`0 0 ${nativeW} ${nativeH}`}>
                    {/* STATIC HOUSING: Does not move when pressed */}
                    <rect x={6} y={50} width={56} height={35} rx={4} fill="#1a202c" /> 
                    <rect x={10} y={46} width={48} height={40} rx={2} fill="#2d3748" />
                    <ellipse cx={34} cy={66} rx={22} ry={12} fill="#4a5568" />
                    <ellipse cx={34} cy={67} rx={20} ry={10} fill="#171923" />

                    {/* INTERACTIVE HIT AREA */}
                    <circle 
                        cx={34} cy={66} r={20} fill="transparent" 
                        onPointerDown={(e) => { e.stopPropagation(); handlePress('pointer'); }}
                        onPointerUp={(e) => { e.stopPropagation(); handleRelease('pointer'); }}
                        onPointerLeave={(e) => { if (isPressedRef.current) handleRelease('pointerleave'); }}
                    />

                    {/* DYNAMIC PLUNGER: Only this group moves */}
                    <g transform={`translate(0, ${isPressed ? 4 : 0})`} style={{ transition: 'transform 60ms ease-out' }}>
                        {(() => {
                            const capHex = BTN_COLORS.find(c => c.value === color)?.hex || '#22c55e';
                            const capFill = isPressed ? darken(capHex, 0.25) : capHex;
                            return (
                                <>
                                    {/* Plunger Body */}
                                    <ellipse cx={34} cy={64} rx={15} ry={10} fill={capFill} stroke="#000" strokeWidth={0.5} />
                                    {/* Gloss Highlight */}
                                    <ellipse 
                                        cx={30} cy={60} rx={isPressed ? 3 : 5} ry={isPressed ? 1 : 2} 
                                        fill="rgba(255,255,255,0.3)" 
                                    />
                                </>
                            );
                        })()}
                    </g>
                </svg>
            </div>
        </div>
    );
};