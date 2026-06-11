import React from 'react';

// Bounding box: width 60, height 90
export const BOUNDS = { x: 0, y: 0, w: 60, h: 90 };

export const NPNTransistorUI = ({ state, attrs }: { state: any, attrs: any }) => {
    return (
        <svg width={BOUNDS.w} height={BOUNDS.h} viewBox="0 0 30 45" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible', pointerEvents: 'none', display: 'block' }}>
            <defs>
                <linearGradient id="legGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#9E9E9E" />
                    <stop offset="50%" stopColor="#EEEEEE" />
                    <stop offset="100%" stopColor="#757575" />
                </linearGradient>
                <linearGradient id="bodyGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#111" />
                    <stop offset="20%" stopColor="#333" />
                    <stop offset="80%" stopColor="#111" />
                    <stop offset="100%" stopColor="#0a0a0a" />
                </linearGradient>
                <linearGradient id="flatFace" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#222" />
                    <stop offset="100%" stopColor="#111" />
                </linearGradient>
            </defs>

            {/* Legs mapping to exactly x=0, 15, 30 at y=45 */}
            {/* Emitter (Left) */}
            <path d="M 9 20 C 6 30, 0 35, 0 45" fill="none" stroke="url(#legGradient)" strokeWidth="2" strokeLinecap="round" />
            {/* Base (Center) - Add slight curve to prevent 0-width bounding box gradient bug */}
            <path d="M 15 20 Q 14.5 32 15 45" fill="none" stroke="url(#legGradient)" strokeWidth="2" strokeLinecap="round" />
            {/* Collector (Right) */}
            <path d="M 21 20 C 24 30, 30 35, 30 45" fill="none" stroke="url(#legGradient)" strokeWidth="2" strokeLinecap="round" />

            {/* Transistor Body (TO-92 style) */}
            {/* Round Back (Top arc) */}
            <path d="M 4 10 C 4 -2, 26 -2, 26 10 Z" fill="url(#bodyGradient)" />
            {/* Main Block */}
            <rect x="4" y="10" width="22" height="12" fill="url(#bodyGradient)" />
            
            {/* Flat face */}
            <path d="M 5 11 L 25 11 L 24 22 L 6 22 Z" fill="url(#flatFace)" stroke="#000" strokeWidth="0.5" />

            {/* Laser Etched Text */}
            <text x="15" y="16" fontSize="4" fill="#777" fontFamily="monospace" textAnchor="middle" style={{ letterSpacing: '0.5px' }}>2N2222</text>
            <text x="15" y="20" fontSize="3" fill="#666" fontFamily="monospace" textAnchor="middle">NPN</text>

            {/* Connection points exactly at y=45 */}
            <circle cx="0" cy="45" r="1.5" fill="#333" />
            <circle cx="15" cy="45" r="1.5" fill="#333" />
            <circle cx="30" cy="45" r="1.5" fill="#333" />

            {/* Labels floating slightly below */}
            <text x="0" y="53" fontSize="5" fill="#555" fontFamily="sans-serif" textAnchor="middle">E</text>
            <text x="15" y="53" fontSize="5" fill="#555" fontFamily="sans-serif" textAnchor="middle">B</text>
            <text x="30" y="53" fontSize="5" fill="#555" fontFamily="sans-serif" textAnchor="middle">C</text>
        </svg>
    );
};
