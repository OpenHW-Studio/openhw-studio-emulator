import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 90, h: 150 };

const LEFT_PINS = ['EN1,2', 'IN1', 'OUT1', 'GND1', 'GND2', 'OUT2', 'IN2', 'VCC2'];
const RIGHT_PINS = ['VCC1', 'IN4', 'OUT4', 'GND4', 'GND3', 'OUT3', 'IN3', 'EN3,4'];

export const L293DUI = ({ state, attrs }: { state: any, attrs: any }) => {
    return (
        <svg width={BOUNDS.w} height={BOUNDS.h} viewBox="0 0 90 150" xmlns="http://www.w3.org/2000/svg">
            <rect width="90" height="150" fill="#2c3e50" rx="6" />
            <circle cx="45" cy="15" r="6" fill="#34495e" />

            <path d="M 36 0 Q 45 15 54 0 Z" fill="#34495e" />

            {/* Left Pins */}
            {LEFT_PINS.map((label, i) => {
                const y = 15 + i * 15;
                return (
                    <g key={`L${i}`}>
                        <rect x="10.5" y={y - 4.5} width="9" height="9" fill="#ecf0f1" />
                        <line x1="0" y1={y} x2="15" y2={y} stroke="#bdc3c7" strokeWidth="3" />
                        <text x="22" y={y + 2.5} fontSize="6" fontFamily="monospace" fill="#bdc3c7" textAnchor="start">{label}</text>
                    </g>
                );
            })}

            {/* Right Pins */}
            {RIGHT_PINS.map((label, i) => {
                const y = 15 + i * 15;
                return (
                    <g key={`R${i}`}>
                        <rect x="70.5" y={y - 4.5} width="9" height="9" fill="#ecf0f1" />
                        <line x1="90" y1={y} x2="75" y2={y} stroke="#bdc3c7" strokeWidth="3" />
                        <text x="68" y={y + 2.5} fontSize="6" fontFamily="monospace" fill="#bdc3c7" textAnchor="end">{label}</text>
                    </g>
                );
            })}

            <text x="45" y="75" fontSize="12" fill="white" textAnchor="middle" transform="rotate(-90 45 75)">L293D</text>
        </svg>
    );
};
