import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 298.7, h: 179.2 };

export const CD74HC4067UI = ({ state, attrs }: { state: any, attrs: any }) => {
    const active = state?.activeChannel ?? -1;

    const nativeW = 300;
    const nativeH = 180;
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
                viewBox="0 0 300 180"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                    display: 'block',
                    transform: `scale(${scaleX}, ${scaleY})`,
                    transformOrigin: '0 0'
                }}
            >

            {/* PCB Base */}
            <rect width="300" height="180" fill="#8e44ad" rx="6" />
            <rect x="5" y="5" width="290" height="170" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" rx="4" />

            {/* Chip outline (Landscape) */}
            <rect x="60" y="70" width="180" height="40" fill="#2c3e50" rx="2" />
            <circle cx="70" cy="90" r="3" fill="#1a252f" />
            <text x="150" y="95" fill="rgba(255,255,255,0.4)" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">CD74HC4067</text>

            {/* Top Pins (Control / Power) - y=15 */}
            <g transform="translate(0, 15)">
                <circle cx="270" cy="0" r="4" fill="#e74c3c" />
                <text x="270" y="15" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">VCC</text>

                <circle cx="240" cy="0" r="4" fill="#34495e" />
                <text x="240" y="15" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">GND</text>

                <circle cx="210" cy="0" r="4" fill="#95a5a6" />
                <text x="210" y="15" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">EN</text>

                <circle cx="165" cy="0" r="4" fill="#f39c12" />
                <text x="165" y="15" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">S0</text>
                <circle cx="135" cy="0" r="4" fill="#f39c12" />
                <text x="135" y="15" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">S1</text>
                <circle cx="105" cy="0" r="4" fill="#f39c12" />
                <text x="105" y="15" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">S2</text>
                <circle cx="75" cy="0" r="4" fill="#f39c12" />
                <text x="75" y="15" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">S3</text>

                <circle cx="30" cy="0" r="4" fill="#3498db" />
                <text x="30" y="15" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">SIG</text>
            </g>

            {/* Bottom Pins (C0-C15) - y=165 */}
            <g transform="translate(0, 165)">
                {Array.from({ length: 16 }).map((_, i) => (
                    <g key={`C${i}`} transform={`translate(${270 - i * 15}, 0)`}>
                        <circle cx="0" cy="0" r="3.5" fill={active === i ? "#2ecc71" : "#ecf0f1"} />
                        <text x="0" y="-10" fontSize="7" fill={active === i ? "#2ecc71" : "white"} textAnchor="middle" fontWeight="bold">C{i}</text>
                    </g>
                ))}
            </g>
        </svg>
    </div>
    );
};

