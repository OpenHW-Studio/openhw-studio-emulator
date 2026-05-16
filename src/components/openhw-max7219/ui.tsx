import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 180, h: 120 };

export const MAX7219UI = ({ state, attrs }: { state: any, attrs: any }) => {
    const { matrix = new Array(8).fill(0), active = false } = state;
    const ledColor = attrs.color || '#FF0000';
    const offColor = '#444444'; // Matches Wokwi's dark grey
    const pinColor = '#C3BA9B'; // Matches Wokwi's beige metallic pins
    
    const leds = [];
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const isOn = active && ((matrix[row] & (1 << (7 - col))) !== 0);
            leds.push(
                <circle 
                    key={`${row}-${col}`}
                    cx={37.5 + col * 15} 
                    cy={7.5 + row * 15} 
                    r={6} 
                    fill={isOn ? ledColor : offColor} 
                />
            );
        }
    }

    const pinYs = [30, 45, 60, 75, 90];

    return (
        <svg width={BOUNDS.w} height={BOUNDS.h} viewBox="0 0 180 120">
            {/* Left Pins (IN) at 15px pitch */}
            {pinYs.map((y, i) => (
                <line key={`l-pin-${i}`} x1="0" y1={y} x2="30" y2={y} stroke={pinColor} strokeWidth="4.5" strokeLinecap="round" />
            ))}

            {/* Right Pins (OUT) at 15px pitch */}
            {pinYs.map((y, i) => (
                <line key={`r-pin-${i}`} x1="150" y1={y} x2="180" y2={y} stroke={pinColor} strokeWidth="4.5" strokeLinecap="round" />
            ))}

            {/* Black Matrix Body */}
            <rect x="30" y="0" width="120" height="120" fill="#000000" />
            
            {/* 8x8 LED Grid */}
            {leds}
        </svg>
    );
};
