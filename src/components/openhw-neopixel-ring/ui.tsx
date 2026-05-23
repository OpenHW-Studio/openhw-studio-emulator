import React from 'react';

// Bounding box for the blue selection ring.
export const BOUNDS = (attrs: any) => {
    const pixels = parseInt(attrs?.pixels || '16', 10);
    const radius = Math.max(10, (pixels * 9) / (2 * Math.PI));
    const size = radius * 2 + 15;
    // Offset so the bottom of the bounds sits exactly at y=60 (where pins are fixed)
    // and horizontally centered around x=30.
    return { x: 30 - size / 2, y: 60 - size, w: size, h: size };
};

export const NeopixelRingUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const pixels = parseInt(attrs?.pixels || '16', 10);
    // Calculate radius to keep consistent LED spacing (~9px per LED circumference)
    const radius = Math.max(10, (pixels * 9) / (2 * Math.PI));
    const size = radius * 2 + 15;
    const center = size / 2;
    
    // Position SVG absolutely so it overflows its default container and aligns with BOUNDS
    const leftOffset = 30 - size / 2;
    const topOffset = 60 - size;

    return (
        <svg 
            width={size} 
            height={size} 
            viewBox={`0 0 ${size} ${size}`} 
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: 'block', position: 'absolute', left: leftOffset, top: topOffset }}
        >
            <circle cx={center} cy={center} r={radius} fill="none" stroke="#222" strokeWidth="4.5" />

            {Array.from({ length: pixels }).map((_, i) => {
                const angle = (i * 360 / pixels) * (Math.PI / 180);
                const x = center + radius * Math.sin(angle);
                const y = center - radius * Math.cos(angle);

                const colorValue = state?.pixels?.[i] || 0;
                const r = (colorValue >> 16) & 0xFF;
                const g = (colorValue >> 8) & 0xFF;
                const b = colorValue & 0xFF;

                const isActive = (r > 0 || g > 0 || b > 0);
                const fill = isActive ? `rgb(${r},${g},${b})` : '#333';
                const shadow = isActive ? `drop-shadow(0 0 3px rgb(${r},${g},${b}))` : 'none';

                return (
                    <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r="2.25"
                        fill={fill}
                        style={{ filter: shadow }}
                    />
                );
            })}
        </svg>
    );
};
