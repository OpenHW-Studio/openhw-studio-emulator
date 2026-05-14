import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 150, h: 90 };

export const LogicAnalyzerUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const isActive = state?.active || false;

    return (
        <svg width={BOUNDS.w} height={BOUNDS.h} viewBox="0 0 150 90" xmlns="http://www.w3.org/2000/svg">
            <rect width="150" height="90" fill="#2c3e50" rx="9" />
            <rect x="6" y="6" width="138" height="45" fill="#34495e" rx="3" />

            <text x="75" y="30" fontSize="12" fill="white" fontWeight="bold" textAnchor="middle">8-CH LOGIC</text>
            <text x="75" y="42" fontSize="9" fill="#bdc3c7" textAnchor="middle">ANALYZER</text>

            {/* Activity LED */}
            <circle cx="15" cy="30" r="4.5" fill={isActive ? "#2ecc71" : "#7f8c8d"} />
            {isActive && (
                <circle cx="15" cy="30" r="7.5" fill="none" stroke="#2ecc71" strokeWidth="1.5" style={{ filter: 'blur(3px)' }} />
            )}

            {/* Pins (15px pitch) */}
            <circle cx="15" cy="90" r="4.5" fill="#34495e" />
            <text x="15" y="75" fontSize="7.5" fill="white" textAnchor="middle">GND</text>

            {[30, 45, 60, 75, 90, 105, 120, 135].map((x, i) => (
                <g key={`D${i}`}>
                    <circle cx={x} cy="90" r="4.5" fill="#f1c40f" />
                    <text x={x} y="75" fontSize="7.5" fill="white" textAnchor="middle">D{i}</text>
                </g>
            ))}
        </svg>
    );
};
