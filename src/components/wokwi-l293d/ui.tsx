import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 90, h: 150 };

export const L293DUI = ({ state, attrs }: { state: any, attrs: any }) => {
    return (
        <svg width={BOUNDS.w} height={BOUNDS.h} viewBox="0 0 90 150" xmlns="http://www.w3.org/2000/svg">
            <rect width="90" height="150" fill="#2c3e50" rx="6" />
            <circle cx="45" cy="15" r="6" fill="#34495e" />

            <path d="M 36 0 Q 45 15 54 0 Z" fill="#34495e" />

            {/* Left Pins (1-8) at 15px pitch */}
            {[15, 30, 45, 60, 75, 90, 105, 120].map((y, i) => (
                <g key={`L${i}`}>
                    <circle cx="15" cy={y} r="4.5" fill="#ecf0f1" />
                    <line x1="0" y1={y} x2="15" y2={y} stroke="#bdc3c7" strokeWidth="3" />
                </g>
            ))}

            {/* Right Pins (16-9) at 15px pitch */}
            {[15, 30, 45, 60, 75, 90, 105, 120].map((y, i) => (
                <g key={`R${i}`}>
                    <circle cx="75" cy={y} r="4.5" fill="#ecf0f1" />
                    <line x1="90" y1={y} x2="75" y2={y} stroke="#bdc3c7" strokeWidth="3" />
                </g>
            ))}

            <text x="45" y="75" fontSize="12" fill="white" textAnchor="middle" transform="rotate(-90 45 75)">L293D</text>
        </svg>
    );
};
