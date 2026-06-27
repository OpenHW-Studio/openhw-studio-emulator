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
    const radius = Math.max(10, (pixels * 9) / (2 * Math.PI));
    const size = radius * 2 + 15;
    const center = size / 2;
    
    const leftOffset = 30 - size / 2;
    const topOffset = 60 - size;

    return (
        <div style={{
            position: 'absolute',
            left: leftOffset,
            top: topOffset,
            width: size,
            height: size,
            pointerEvents: 'none'
        }}>
            <svg 
                width="100%" 
                height="100%" 
                viewBox={`0 0 ${size} ${size}`} 
                xmlns="http://www.w3.org/2000/svg"
                style={{ display: 'block', overflow: 'visible' }}
            >
                {/* Connection Tab bridging the ring to the fixed pins at the bottom */}
                <path d={`M ${center - 25} ${size} L ${center + 25} ${size} L ${center + 15} ${center + radius} L ${center - 15} ${center + radius} Z`} fill="#111827" stroke="#1f2937" strokeWidth="1" />

                {/* Thick PCB Ring */}
                <circle cx={center} cy={center} r={radius} fill="none" stroke="#111827" strokeWidth="12" />
                <circle cx={center} cy={center} r={radius + 6} fill="none" stroke="#1f2937" strokeWidth="0.5" />
                <circle cx={center} cy={center} r={radius - 6} fill="none" stroke="#1f2937" strokeWidth="0.5" />

                {/* Concentric Copper Traces */}
                <circle cx={center} cy={center} r={radius + 3} fill="none" stroke="#ca8a04" strokeWidth="0.5" opacity="0.3" />
                <circle cx={center} cy={center} r={radius - 3} fill="none" stroke="#ca8a04" strokeWidth="0.5" opacity="0.3" />

                {/* 5050 SMD LEDs */}
                {Array.from({ length: pixels }).map((_, i) => {
                    const angleDeg = i * (360 / pixels);
                    const colorValue = state?.pixels?.[i] || 0;
                    const r = (colorValue >> 16) & 0xFF;
                    const g = (colorValue >> 8) & 0xFF;
                    const b = colorValue & 0xFF;

                    const isActive = (r > 0 || g > 0 || b > 0);
                    const fill = isActive ? `rgb(${r},${g},${b})` : '#333';
                    const glowColor = isActive ? `rgba(${r},${g},${b}, 0.8)` : 'transparent';
                    
                    return (
                        <g key={i} transform={`rotate(${angleDeg}, ${center}, ${center}) translate(${center}, ${center - radius})`}>
                            {/* White 5050 Package */}
                            <rect x="-3" y="-3" width="6" height="6" fill="#f1f5f9" rx="0.5" />
                            {/* Package Contacts */}
                            <rect x="-3.5" y="-2" width="1" height="1" fill="#94a3b8" />
                            <rect x="-3.5" y="1" width="1" height="1" fill="#94a3b8" />
                            <rect x="2.5" y="-2" width="1" height="1" fill="#94a3b8" />
                            <rect x="2.5" y="1" width="1" height="1" fill="#94a3b8" />
                            
                            {/* Inner Lens / Glowing Element */}
                            <circle cx="0" cy="0" r="2.2" fill="#1f2937" />
                            <circle 
                                cx="0" cy="0" r="1.8" 
                                fill={fill} 
                                style={{
                                    filter: isActive ? `drop-shadow(0px 0px 4px ${glowColor})` : 'none',
                                    transition: 'fill 0.1s, filter 0.1s'
                                }}
                            />
                        </g>
                    );
                })}

                {/* Fixed Header Pins (VCC, GND, DIN, DOUT) */}
                {/* These are drawn relative to the bounding box of the SVG.
                    We know the absolute component coords of the pins are y=60, x=[7.5, 22.5, 37.5, 52.5].
                    To map these into the SVG viewBox, SVG X = Component X - leftOffset. SVG Y = Component Y - topOffset.
                */}
                {[
                    { label: 'VCC', x: 7.5 },
                    { label: 'GND', x: 22.5 },
                    { label: 'DIN', x: 37.5 },
                    { label: 'DOUT', x: 52.5 }
                ].map(pin => {
                    const svgX = pin.x - leftOffset;
                    const svgY = 60 - topOffset; // Note: Component y=60
                    return (
                        <g key={pin.label}>
                            {/* Gold Pad */}
                            <circle cx={svgX} cy={svgY} r="3" fill="#ca8a04" />
                            <circle cx={svgX} cy={svgY} r="2" fill="#fef08a" />
                            <circle cx={svgX} cy={svgY} r="1" fill="#111" />
                            {/* Silkscreen Label */}
                            <text x={svgX} y={svgY - 5} fontSize="3.5" fontFamily="monospace" fill="#fff" fontWeight="bold" textAnchor="middle">
                                {pin.label}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};
