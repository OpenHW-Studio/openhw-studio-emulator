import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 164.0625, h: 312.5 };

const PlaceholderSvg = () => (
  <svg width="100%" height="100%" viewBox="0 0 164 312" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="20" width="124" height="272" fill="#2c2c2c" rx="8" />
    <rect x="40" y="40" width="84" height="84" fill="#111" rx="4" />
    <text x="82" y="150" fill="#eee" fontSize="14" fontFamily="monospace" textAnchor="middle">ESP32-S31</text>
    {/* Left Pins */}
    {Array.from({ length: 13 }).map((_, i) => (
      <rect key={`L${i}`} x="8" y={35 + i * 15} width="12" height="6" fill="#f0d000" />
    ))}
    {/* Right Pins */}
    {Array.from({ length: 11 }).map((_, i) => (
      <rect key={`R${i}`} x="144" y={35 + i * 15} width="12" height="6" fill="#f0d000" />
    ))}
  </svg>
);

export const Esp32S31UI = ({ id, attrs, isRunning }: { id: string, attrs: any, isRunning?: boolean }) => {
  return (
    <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h }}>
      <PlaceholderSvg />
      <div style={{
        position: 'absolute',
        top: 312.5,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: 10,
        fontWeight: 'bold',
        color: 'var(--text3)',
        opacity: 0.15,
        pointerEvents: 'none',
        fontFamily: 'sans-serif'
      }}>
        OPENHW STUDIO
      </div>
    </div>
  );
};
