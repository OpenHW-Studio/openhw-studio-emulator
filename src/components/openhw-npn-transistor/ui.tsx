import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 30, h: 45 };

export const NPNTransistorUI = ({ state, attrs }: { state: any, attrs: any }) => {
    return (
        <svg width={BOUNDS.w} height={BOUNDS.h} viewBox="0 0 30 45" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible', pointerEvents: 'none' }}>
            {/* Transistor Body (TO-92 style) */}
            <path d="M 4 15 C 4 -2, 26 -2, 26 15 Z" fill="#2c3e50" />
            <rect x="4" y="15" width="22" height="10" fill="#2c3e50" />
            
            {/* Flat face detail */}
            <rect x="5" y="18" width="20" height="4" fill="#34495e" />

            {/* Legs */}
            <line x1="6" y1="25" x2="0" y2="45" stroke="#bdc3c7" strokeWidth="1.6" />
            <line x1="15" y1="25" x2="15" y2="45" stroke="#bdc3c7" strokeWidth="1.6" />
            <line x1="24" y1="25" x2="30" y2="45" stroke="#bdc3c7" strokeWidth="1.6" />

            {/* Pins */}
            <circle cx="0" cy="45" r="2" fill="#ecf0f1" stroke="#7f8c8d" strokeWidth="0.5" />
            <circle cx="15" cy="45" r="2" fill="#ecf0f1" stroke="#7f8c8d" strokeWidth="0.5" />
            <circle cx="30" cy="45" r="2" fill="#ecf0f1" stroke="#7f8c8d" strokeWidth="0.5" />

            {/* Labels */}
            <text x="0" y="54" fontSize="6" fill="#333" fontFamily="sans-serif" textAnchor="middle">E</text>
            <text x="15" y="54" fontSize="6" fill="#333" fontFamily="sans-serif" textAnchor="middle">B</text>
            <text x="30" y="54" fontSize="6" fill="#333" fontFamily="sans-serif" textAnchor="middle">C</text>
        </svg>
    );
};
