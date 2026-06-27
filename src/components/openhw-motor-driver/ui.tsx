import React from 'react';

// Bounding box for the L298N
export const BOUNDS = { x: 0, y: 0, w: 80, h: 80 };

export const MotorDriverUI = ({ state, attrs }: { state: any, attrs: any }) => {
    return (
        <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h, pointerEvents: 'none' }}>
            <svg width="80" height="80" viewBox="0 0 80 80">
                <defs>
                    {/* PCB Texture */}
                    <linearGradient id="pcbRed" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#C0392B" />
                        <stop offset="100%" stopColor="#922B21" />
                    </linearGradient>
                    <linearGradient id="heatsink" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#E0E0E0" />
                        <stop offset="20%" stopColor="#FFFFFF" />
                        <stop offset="50%" stopColor="#9E9E9E" />
                        <stop offset="100%" stopColor="#616161" />
                    </linearGradient>
                    <linearGradient id="terminalBlue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2980B9" />
                        <stop offset="100%" stopColor="#1A5276" />
                    </linearGradient>
                </defs>

                {/* Main Red PCB Board */}
                <rect x="2" y="2" width="76" height="76" rx="2" fill="url(#pcbRed)" stroke="#7B241C" strokeWidth="1" />
                {/* PCB Mounting Holes */}
                <circle cx="8" cy="8" r="1.5" fill="#222" />
                <circle cx="72" cy="8" r="1.5" fill="#222" />
                <circle cx="8" cy="72" r="1.5" fill="#222" />
                <circle cx="72" cy="72" r="1.5" fill="#222" />

                {/* --- Heatsink and IC --- */}
                <rect x="15" y="25" width="50" height="30" fill="url(#heatsink)" stroke="#757575" strokeWidth="1" />
                {/* Heatsink Fins */}
                <path d="M 20 25 L 20 55 M 25 25 L 25 55 M 30 25 L 30 55 M 35 25 L 35 55 M 40 25 L 40 55 M 45 25 L 45 55 M 50 25 L 50 55 M 55 25 L 55 55 M 60 25 L 60 55" stroke="#757575" strokeWidth="1" />
                {/* L298N IC (Attached to Heatsink) */}
                <rect x="25" y="45" width="30" height="15" fill="#111" rx="1" />
                <text x="40" y="55" fill="#555" fontSize="6" fontFamily="sans-serif" textAnchor="middle">L298N</text>

                {/* --- Top Power Terminal (y=0) --- */}
                {/* Visual blue terminal block */}
                <rect x="15" y="2" width="50" height="10" fill="url(#terminalBlue)" stroke="#154360" strokeWidth="1" rx="1" />
                {/* Screw Heads */}
                <circle cx="20" cy="7" r="2.5" fill="#BDC3C7" />
                <circle cx="40" cy="7" r="2.5" fill="#BDC3C7" />
                <circle cx="60" cy="7" r="2.5" fill="#BDC3C7" />
                {/* Labels */}
                <text x="20" y="20" fill="#FFF" fontSize="5" fontFamily="sans-serif" textAnchor="middle">12V</text>
                <text x="40" y="20" fill="#FFF" fontSize="5" fontFamily="sans-serif" textAnchor="middle">GND</text>
                <text x="60" y="20" fill="#FFF" fontSize="5" fontFamily="sans-serif" textAnchor="middle">5V</text>
                {/* Connecting lines exactly to y=0 */}
                <path d="M 20 2 L 20 0 M 40 2 L 40 0 M 60 2 L 60 0" stroke="#BDC3C7" strokeWidth="2" />

                {/* --- Bottom Motor Terminal (y=80) --- */}
                <rect x="15" y="68" width="70" height="10" fill="url(#terminalBlue)" stroke="#154360" strokeWidth="1" rx="1" />
                {/* Screw Heads */}
                <circle cx="20" cy="73" r="2.5" fill="#BDC3C7" />
                <circle cx="40" cy="73" r="2.5" fill="#BDC3C7" />
                <circle cx="60" cy="73" r="2.5" fill="#BDC3C7" />
                <circle cx="80" cy="73" r="2.5" fill="#BDC3C7" />
                {/* Labels */}
                <text x="20" y="65" fill="#FFF" fontSize="5" fontFamily="sans-serif" textAnchor="middle">O1</text>
                <text x="40" y="65" fill="#FFF" fontSize="5" fontFamily="sans-serif" textAnchor="middle">O2</text>
                <text x="60" y="65" fill="#FFF" fontSize="5" fontFamily="sans-serif" textAnchor="middle">O3</text>
                <text x="75" y="65" fill="#FFF" fontSize="5" fontFamily="sans-serif" textAnchor="middle">O4</text>
                {/* Connecting lines exactly to y=80 */}
                <path d="M 20 78 L 20 80 M 40 78 L 40 80 M 60 78 L 60 80 M 80 78 L 80 80" stroke="#BDC3C7" strokeWidth="2" />

                {/* --- Left Logic Pins (x=0) --- */}
                {/* ENA, IN1, IN2, IN3 at y=10, 30, 50, 70 */}
                <rect x="2" y="8" width="4" height="4" fill="#111" />
                <rect x="2" y="28" width="4" height="4" fill="#111" />
                <rect x="2" y="48" width="4" height="4" fill="#111" />
                <rect x="2" y="68" width="4" height="4" fill="#111" />
                {/* Metallic pins to x=0 */}
                <path d="M 2 10 L 0 10 M 2 30 L 0 30 M 2 50 L 0 50 M 2 70 L 0 70" stroke="#BDC3C7" strokeWidth="2" />
                <text x="8" y="12" fill="#FFF" fontSize="5" fontFamily="sans-serif" textAnchor="start">ENA</text>
                <text x="8" y="32" fill="#FFF" fontSize="5" fontFamily="sans-serif" textAnchor="start">IN1</text>
                <text x="8" y="52" fill="#FFF" fontSize="5" fontFamily="sans-serif" textAnchor="start">IN2</text>
                <text x="8" y="72" fill="#FFF" fontSize="5" fontFamily="sans-serif" textAnchor="start">IN3</text>

                {/* --- Right Logic Pins (x=80) --- */}
                {/* IN4, ENB at y=10, 30 */}
                <rect x="74" y="8" width="4" height="4" fill="#111" />
                <rect x="74" y="28" width="4" height="4" fill="#111" />
                {/* Metallic pins to x=80 */}
                <path d="M 78 10 L 80 10 M 78 30 L 80 30" stroke="#BDC3C7" strokeWidth="2" />
                <text x="72" y="12" fill="#FFF" fontSize="5" fontFamily="sans-serif" textAnchor="end">IN4</text>
                <text x="72" y="32" fill="#FFF" fontSize="5" fontFamily="sans-serif" textAnchor="end">ENB</text>
                
                {/* Electrolytic Capacitors */}
                <circle cx="68" cy="45" r="4" fill="#2E4053" stroke="#D4AC0D" strokeWidth="1" />
                <circle cx="68" cy="55" r="4" fill="#2E4053" stroke="#D4AC0D" strokeWidth="1" />
            </svg>
        </div>
    );
};
