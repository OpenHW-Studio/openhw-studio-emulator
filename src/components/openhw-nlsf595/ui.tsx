import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 128, h: 64 };

export const NLSF595UI = ({ state, attrs }: { state: any, attrs: any }) => {
    const r = state?.r || 0;
    const g = state?.g || 0;
    const b = state?.b || 0;
    const color = `rgb(${r}, ${g}, ${b})`;

    return (
        <svg width={BOUNDS.w} height={BOUNDS.h} viewBox="0 0 128 64" xmlns="http://www.w3.org/2000/svg">
            {/* Board */}
            <rect width="128" height="64" fill="#2980b9" rx="6.5" />

            {/* Chip */}
            <rect x="43" y="11" width="43" height="43" fill="#2c3e50" rx="2.2" />
            <circle cx="49" cy="17" r="3.2" fill="#7f8c8d" />

            {/* LED visually tied to the output */}
            <circle cx="96" cy="32" r="10.7" fill={color} stroke="#34495e" strokeWidth="2" />

            {/* Glow effect if LED is on */}
            {(r > 0 || g > 0 || b > 0) && (
                <circle cx="96" cy="32" r="12.8" fill="none" stroke={color} strokeWidth="4.3" style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
            )}

            {/* Left Pins (15px pitch) */}
            <circle cx="11" cy="11" r="4.3" fill="#e74c3c" />
            <circle cx="11" cy="26" r="4.3" fill="#34495e" />
            <circle cx="11" cy="41" r="4.3" fill="#f1c40f" />
            <circle cx="11" cy="56" r="4.3" fill="#3498db" />

            <text x="19" y="13" fontSize="6.4" fill="white" alignmentBaseline="middle">VCC</text>
            <text x="19" y="28" fontSize="6.4" fill="white" alignmentBaseline="middle">GND</text>
            <text x="19" y="43" fontSize="6.4" fill="white" alignmentBaseline="middle">MOSI</text>
            <text x="19" y="58" fontSize="6.4" fill="white" alignmentBaseline="middle">SCK</text>
            <text x="34" y="58" fontSize="6.4" fill="white" alignmentBaseline="middle">CS</text>

            <circle cx="26" cy="56" r="4.3" fill="#9b59b6" />

            {/* Right Pins (15px pitch) */}
            <circle cx="118" cy="11" r="4.3" fill="#e74c3c" />
            <circle cx="118" cy="26" r="4.3" fill="#2ecc71" />
            <circle cx="118" cy="41" r="4.3" fill="#3498db" />

            <text x="109" y="13" fontSize="6.4" fill="white" textAnchor="end" alignmentBaseline="middle">R1</text>
            <text x="109" y="28" fontSize="6.4" fill="white" textAnchor="end" alignmentBaseline="middle">G1</text>
            <text x="109" y="43" fontSize="6.4" fill="white" textAnchor="end" alignmentBaseline="middle">B1</text>

        </svg>
    );
};
