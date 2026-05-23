import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 135, h: 75 };

export const Dipswitch8UI = ({ state, attrs, isRunning }: { state: any, attrs: any, isRunning: boolean }) => {
    const switches = state?.switches ?? ['off', 'off', 'off', 'off', 'off', 'off', 'off', 'off'];
    const uniqueId = state?.id || Math.random().toString(36).substring(2, 9);

    const nativeW = 135;
    const nativeH = 75;

    const handleToggle = (index: number) => {
        if (attrs.onInteract) {
            attrs.onInteract(`toggle:${index}`);
        }
    };

    return (
        <div style={{
            pointerEvents: 'none',
            position: 'absolute',
            inset: 0,
            width: BOUNDS.w,
            height: BOUNDS.h
        }}>
            <div
                style={{
                    position: 'relative',
                    width: nativeW,
                    height: nativeH,
                    filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.3))'
                }}
            >
                <svg
                    width={nativeW}
                    height={nativeH}
                    viewBox={`0 0 ${nativeW} ${nativeH}`}
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        {/* Red plastic body gradient */}
                        <linearGradient id={`body-grad-${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#ef4444" />
                            <stop offset="30%" stopColor="#dc2626" />
                            <stop offset="100%" stopColor="#991b1b" />
                        </linearGradient>
                        {/* Metal pin gradient */}
                        <linearGradient id={`pin-grad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#9ca3af" />
                            <stop offset="50%" stopColor="#f3f4f6" />
                            <stop offset="100%" stopColor="#6b7280" />
                        </linearGradient>
                        {/* White switch knob 3D gradient */}
                        <linearGradient id={`knob-grad-${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#ffffff" />
                            <stop offset="80%" stopColor="#f3f4f6" />
                            <stop offset="100%" stopColor="#d1d5db" />
                        </linearGradient>
                        {/* Dark slot inner shadow gradient */}
                        <linearGradient id={`slot-grad-${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#09090b" />
                            <stop offset="100%" stopColor="#18181b" />
                        </linearGradient>
                    </defs>

                    {/* Pin Legs (Top Row: 1-8, Bottom Row: 1B-8B) */}
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                        const px = 15 + i * 15;
                        return (
                            <g key={`pins-${i}`}>
                                {/* Top pin leg (y = 15 to 0) */}
                                <rect x={px - 1.5} y="0" width="3" height="15" fill={`url(#pin-grad-${uniqueId})`} rx="0.5" />
                                {/* Bottom pin leg (y = 60 to 75) */}
                                <rect x={px - 1.5} y="60" width="3" height="15" fill={`url(#pin-grad-${uniqueId})`} rx="0.5" />
                            </g>
                        );
                    })}

                    {/* Red DIP Switch Outer Housing */}
                    <rect x="5" y="10" width="125" height="55" rx="3" fill={`url(#body-grad-${uniqueId})`} stroke="#7f1d1d" strokeWidth="0.8" />
                    
                    {/* Bevel details for 3D realism */}
                    <rect x="7" y="12" width="121" height="51" fill="none" stroke="#f87171" strokeWidth="0.5" strokeOpacity="0.5" rx="2" />
                    <line x1="5" y1="13" x2="130" y2="13" stroke="#f87171" strokeWidth="0.8" strokeOpacity="0.6" />
                    <line x1="5" y1="62" x2="130" y2="62" stroke="#7f1d1d" strokeWidth="0.8" />

                    {/* Brand/Label details */}
                    <text x="10" y="24" fill="#ffffff" fillOpacity="0.9" fontSize="6.5" fontWeight="900" fontFamily="system-ui, sans-serif" letterSpacing="0.2">ON</text>
                    {/* Small arrow pointing down */}
                    <path d="M 12 28 L 12 32 M 10 30 L 12 32 L 14 30" stroke="#ffffff" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round" />

                    {/* 8 Switch Channels */}
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                        const px = 15 + i * 15;
                        const isClosed = switches[i] === 'on';
                        // Knob slides from y=16 (off) to y=32 (on)
                        const knobY = isClosed ? 32 : 16;

                        return (
                            <g key={`sw-${i}`}>
                                {/* Switch Slot Track */}
                                <rect x={px - 3.5} y="15" width="7" height="28" rx="1" fill={`url(#slot-grad-${uniqueId})`} stroke="#450a0a" strokeWidth="0.8" />
                                
                                {/* White Toggle Slider */}
                                <g
                                    transform={`translate(0, ${knobY})`}
                                    style={{ transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)' }}
                                >
                                    {/* Toggle main body */}
                                    <rect x={px - 4.5} y="0" width="9" height="11" rx="1.5" fill={`url(#knob-grad-${uniqueId})`} stroke="#111827" strokeWidth="0.5" />
                                    {/* Ridges on the white slider knob */}
                                    <line x1={px - 2.5} y1="3" x2={px + 2.5} y2="3" stroke="#9ca3af" strokeWidth="0.8" />
                                    <line x1={px - 2.5} y1="5.5" x2={px + 2.5} y2="5.5" stroke="#9ca3af" strokeWidth="0.8" />
                                    <line x1={px - 2.5} y1="8" x2={px + 2.5} y2="8" stroke="#9ca3af" strokeWidth="0.8" />
                                </g>

                                {/* Switch Number text */}
                                <text
                                    x={px}
                                    y="56"
                                    fill="#ffffff"
                                    fillOpacity="0.95"
                                    fontSize="8"
                                    fontWeight="bold"
                                    fontFamily="monospace, sans-serif"
                                    textAnchor="middle"
                                >
                                    {i + 1}
                                </text>

                                {/* Transparent interaction layer */}
                                <rect
                                    x={px - 7.5}
                                    y="14"
                                    width="15"
                                    height="30"
                                    fill="transparent"
                                    style={{
                                        cursor: 'pointer',
                                        pointerEvents: isRunning ? 'auto' : 'none'
                                    }}
                                    onPointerDown={(e) => {
                                        e.stopPropagation();
                                        handleToggle(i);
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                />
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
};
