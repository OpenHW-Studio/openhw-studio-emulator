import React, { useState, useEffect } from 'react';

export const NtcUI = ({ state, attrs, isRunning, onEvent }: { state: any, attrs: any, isRunning: boolean, onEvent?: (event: any) => void }) => {
    const temp = state?.temperature ?? attrs?.temperature ?? 25;

    const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (onEvent) {
            onEvent({ type: 'temperature', value: parseFloat(e.target.value) });
        }
    };

    // Calculate dynamic color for the thermal aura based on temperature (-40 to 125)
    const tempRatio = Math.max(0, Math.min(1, (temp + 40) / 165));
    // Hue ranges from 240 (Blue/Cold) to 0 (Red/Hot)
    const hue = (1 - tempRatio) * 240; 

    return (
        <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h }}>
            <svg 
                width="100%" height="100%" viewBox="0 0 22.5 22.5" 
                style={{ display: 'block', overflow: 'visible', pointerEvents: 'none' }}
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <radialGradient id="ntcBody" cx="30%" cy="30%" r="60%">
                        <stop offset="0%" stopColor="#4A5568" />
                        <stop offset="60%" stopColor="#1A202C" />
                        <stop offset="100%" stopColor="#000000" />
                    </radialGradient>
                    <radialGradient id="highlight" cx="30%" cy="30%" r="40%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                    </radialGradient>
                    <linearGradient id="legMetal" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#9CA3AF" />
                        <stop offset="50%" stopColor="#F3F4F6" />
                        <stop offset="100%" stopColor="#6B7280" />
                    </linearGradient>
                </defs>

                {/* Thermal Aura (Color mapped to temperature) */}
                <circle 
                    cx="11.25" cy="10" r="9" 
                    fill={`hsla(${hue}, 100%, 50%, 0.25)`} 
                    style={{ mixBlendMode: 'screen', filter: 'blur(2px)' }} 
                />

                {/* Metallic Legs curving to the 15px pitch anchor points */}
                <path d="M 9 14.5 L 9 17 Q 9 20 3.75 22.5" fill="none" stroke="url(#legMetal)" strokeWidth="1.2" strokeLinecap="round" />
                <path d="M 13.5 14.5 L 13.5 17 Q 13.5 20 18.75 22.5" fill="none" stroke="url(#legMetal)" strokeWidth="1.2" strokeLinecap="round" />

                {/* Connection points exactly at y=22.5 */}
                <circle cx="3.75" cy="22.5" r="1.5" fill="#333" />
                <circle cx="18.75" cy="22.5" r="1.5" fill="#333" />

                {/* Epoxy Bead (Teardrop shape) */}
                <path 
                    d="M 7.25 7 
                       A 4 4 0 0 1 15.25 7 
                       C 15.25 11, 14 14, 13.5 15
                       C 12 16, 10.5 16, 9 15
                       C 8.5 14, 7.25 11, 7.25 7 Z"
                    fill="url(#ntcBody)" 
                />
                
                {/* Glossy White Reflection for Realism */}
                <path 
                    d="M 7.25 7 
                       A 4 4 0 0 1 15.25 7 
                       C 15.25 11, 14 14, 13.5 15
                       C 12 16, 10.5 16, 9 15
                       C 8.5 14, 7.25 11, 7.25 7 Z"
                    fill="url(#highlight)" 
                />
            </svg>

            {/* Hidden simulation slider (only shows when running) */}
            {isRunning && (
                <div style={{ 
                    position: 'absolute', 
                    top: '-45px', 
                    background: 'rgba(0,0,0,0.85)', 
                    padding: '6px 10px', 
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    pointerEvents: 'auto',
                    zIndex: 1000,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerMove={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseMove={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <span>Temp</span>
                        <span>{temp}°C</span>
                    </div>
                    <input 
                        type="range" 
                        min="-40" 
                        max="125" 
                        value={temp} 
                        onChange={handleSlider}
                        style={{ width: '80px', height: '4px', cursor: 'pointer' }}
                    />
                </div>
            )}
        </div>
    );
};

export const BOUNDS = { x: 0, y: 0, w: 22.5, h: 22.5 };
