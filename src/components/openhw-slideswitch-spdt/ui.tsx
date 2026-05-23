import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 60, h: 45 };

export const SlideswitchSpdtUI = ({ state, attrs, isRunning }: { state: any, attrs: any, isRunning: boolean }) => {
    const position = state?.position ?? 'left';
    const uniqueId = state?.id || Math.random().toString(36).substring(2, 9);

    const nativeW = 60;
    const nativeH = 45;
    const scaleX = BOUNDS.w / nativeW;
    const scaleY = BOUNDS.h / nativeH;

    const handleToggle = () => {
        if (attrs.onInteract) attrs.onInteract('toggle');
    };

    const knobOffset = position === 'left' ? 0 : 18;

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
                    handleToggle();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                    position: 'relative',
                    width: nativeW,
                    height: nativeH,
                    transform: `scale(${scaleX}, ${scaleY})`,
                    transformOrigin: '0 0',
                    cursor: 'pointer',
                    pointerEvents: isRunning ? 'auto' : 'none',
                    filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.25))'
                }}>
                <svg
                    width={nativeW}
                    height={nativeH}
                    viewBox="0 0 60 45"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        <linearGradient id={`metal-grad-${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#f3f4f6" />
                            <stop offset="35%" stopColor="#e5e7eb" />
                            <stop offset="100%" stopColor="#9ca3af" />
                        </linearGradient>
                        <linearGradient id={`knob-grad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#3f3f46" />
                            <stop offset="50%" stopColor="#27272a" />
                            <stop offset="100%" stopColor="#18181b" />
                        </linearGradient>
                        <linearGradient id={`leg-grad-${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#e5e7eb" />
                            <stop offset="100%" stopColor="#9ca3af" />
                        </linearGradient>
                    </defs>

                    {/* Legs (Terminals 1, COM, 2) connected to pins at (15,45), (30,45), (45,45) */}
                    <rect x="13.5" y="32" width="3" height="13" fill={`url(#leg-grad-${uniqueId})`} rx="0.5" />
                    <rect x="28.5" y="32" width="3" height="13" fill={`url(#leg-grad-${uniqueId})`} rx="0.5" />
                    <rect x="43.5" y="32" width="3" height="13" fill={`url(#leg-grad-${uniqueId})`} rx="0.5" />

                    {/* Visual connection pin pads */}
                    <circle cx="15" cy="43.5" r="1.5" fill="#9ca3af" />
                    <circle cx="30" cy="43.5" r="1.5" fill="#9ca3af" />
                    <circle cx="45" cy="43.5" r="1.5" fill="#9ca3af" />

                    {/* Left & Right Mounting Metal Brackets */}
                    <path d="M 5 20 L 1 23 L 1 35 L 4 35 L 4 23 Z" fill={`url(#leg-grad-${uniqueId})`} stroke="#71717a" strokeWidth="0.5" />
                    <path d="M 55 20 L 59 23 L 59 35 L 56 35 L 56 23 Z" fill={`url(#leg-grad-${uniqueId})`} stroke="#71717a" strokeWidth="0.5" />

                    {/* Main Metal Switch Case */}
                    <rect x="5" y="12" width="50" height="20" rx="1.5" fill={`url(#metal-grad-${uniqueId})`} stroke="#4b5563" strokeWidth="0.8" />
                    
                    {/* Metal Case Corner Rivets */}
                    <circle cx="7.5" cy="14.5" r="0.8" fill="#4b5563" />
                    <circle cx="52.5" cy="14.5" r="0.8" fill="#4b5563" />
                    <circle cx="7.5" cy="29.5" r="0.8" fill="#4b5563" />
                    <circle cx="52.5" cy="29.5" r="0.8" fill="#4b5563" />

                    {/* Dark slider track slot */}
                    <rect x="13" y="16" width="34" height="12" rx="1" fill="#09090b" stroke="#3f3f46" strokeWidth="0.5" />

                    {/* Animated Slide Knob */}
                    <g 
                        transform={`translate(${knobOffset}, 0)`} 
                        style={{ transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    >
                        {/* Knob Body */}
                        <rect x="14" y="6" width="14" height="18" rx="1" fill={`url(#knob-grad-${uniqueId})`} stroke="#09090b" strokeWidth="0.8" />
                        
                        {/* Ridges on slider knob */}
                        <line x1="17.5" y1="9" x2="17.5" y2="21" stroke="#71717a" strokeWidth="0.8" />
                        <line x1="21" y1="9" x2="21" y2="21" stroke="#71717a" strokeWidth="0.8" />
                        <line x1="24.5" y1="9" x2="24.5" y2="21" stroke="#71717a" strokeWidth="0.8" />
                    </g>
                </svg>
            </div>
        </div>
    );
};
