import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 120, h: 75 };

export const A4988UI = ({ state, attrs }: { state: any, attrs: any }) => {
    const nativeW = 80;
    const nativeH = 50;
    const scaleX = BOUNDS.w / nativeW;
    const scaleY = BOUNDS.h / nativeH;

    return (
        <div style={{
            pointerEvents: 'none',
            width: BOUNDS.w,
            height: BOUNDS.h,
            position: 'relative'
        }}>
            <svg
                width={nativeW}
                height={nativeH}
                viewBox="0 0 80 50"
                style={{
                    display: 'block',
                    transform: `scale(${scaleX}, ${scaleY})`,
                    transformOrigin: '0 0'
                }}
            >
                {/* PCB Base (Horizontal) */}
                <rect width="80" height="50" fill="#e74c3c" rx="2" />

                {/* Chip outline */}
                <rect x="30" y="15" width="20" height="20" fill="#2c3e50" rx="1" />
                <circle cx="35" cy="20" r="1" fill="#7f8c8d" />

                {/* Trimpot */}
                <circle cx="65" cy="25" r="5" fill="#f1c40f" />
                <line x1="62" y1="22" x2="68" y2="28" stroke="#d35400" strokeWidth="1" />
                <line x1="68" y1="22" x2="62" y2="28" stroke="#d35400" strokeWidth="1" />

                {/* Top Pins (DIR to ENABLE) */}
                {[10, 20, 30, 40, 50, 60, 70, 80].reverse().map((x, i) => (
                    <g key={`t${i}`}>
                        <circle cx={x - 5} cy="5" r="2.5" fill="#34495e" />
                        <circle cx={x - 5} cy="5" r="1" fill="#ecf0f1" />
                    </g>
                ))}

                {/* Bottom Pins (GND_LOGIC to VMOT) */}
                {[10, 20, 30, 40, 50, 60, 70, 80].reverse().map((x, i) => (
                    <g key={`b${i}`}>
                        <circle cx={x - 5} cy="45" r="2.5" fill="#34495e" />
                        <circle cx={x - 5} cy="45" r="1" fill="#ecf0f1" />
                    </g>
                ))}

                {/* Labels Top */}
                <text x="75" y="12" fontSize="3" fill="white" fontWeight="bold" textAnchor="middle">EN</text>
                <text x="65" y="12" fontSize="3" fill="white" fontWeight="bold" textAnchor="middle">MS1</text>
                <text x="55" y="12" fontSize="3" fill="white" fontWeight="bold" textAnchor="middle">MS2</text>
                <text x="45" y="12" fontSize="3" fill="white" fontWeight="bold" textAnchor="middle">MS3</text>
                <text x="35" y="12" fontSize="3" fill="white" fontWeight="bold" textAnchor="middle">RST</text>
                <text x="25" y="12" fontSize="3" fill="white" fontWeight="bold" textAnchor="middle">SLP</text>
                <text x="15" y="12" fontSize="3" fill="white" fontWeight="bold" textAnchor="middle">STEP</text>
                <text x="5" y="12" fontSize="3" fill="white" fontWeight="bold" textAnchor="middle">DIR</text>

                {/* Labels Bottom */}
                <text x="75" y="42" fontSize="3" fill="white" fontWeight="bold" textAnchor="middle">VMOT</text>
                <text x="65" y="42" fontSize="3" fill="white" fontWeight="bold" textAnchor="middle">GND</text>
                <text x="55" y="42" fontSize="3" fill="white" fontWeight="bold" textAnchor="middle">2B</text>
                <text x="45" y="42" fontSize="3" fill="white" fontWeight="bold" textAnchor="middle">2A</text>
                <text x="35" y="42" fontSize="3" fill="white" fontWeight="bold" textAnchor="middle">1A</text>
                <text x="25" y="42" fontSize="3" fill="white" fontWeight="bold" textAnchor="middle">1B</text>
                <text x="15" y="42" fontSize="3" fill="white" fontWeight="bold" textAnchor="middle">VDD</text>
                <text x="5" y="42" fontSize="3" fill="white" fontWeight="bold" textAnchor="middle">GND</text>
            </svg>
        </div>
    );
};
