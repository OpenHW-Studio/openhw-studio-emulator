import React from 'react';



export const BOUNDS = { x: 0, y: 0, w: 60, h: 60 };

interface NeopixelRingProps {
  state?: { pixels?: number[] };
  attrs?: { pixels?: string };
}

export const NeopixelRingUI = ({ state, attrs }: NeopixelRingProps) => {
  const pixelsCount = parseInt(attrs?.pixels || '16', 10);
  const center = 30;
  const ringRadius = 22.5;
  const ledSize = 5; // Slightly larger for detail

  return (
    <svg
      viewBox="0 0 60 60"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
    >
      <defs>
        {/* Radial gradient for the "LED glow" effect on the PCB */}
        <radialGradient id="ledGlow">
          <stop offset="20%" stopColor="white" stopOpacity="0.6" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 1. The PCB Body */}
      <circle cx={center} cy={center} r={ringRadius} fill="none" stroke="#1a4331" strokeWidth="8" />
      <circle cx={center} cy={center} r={ringRadius} fill="none" stroke="#143627" strokeWidth="0.5" />

      {/* 2. Connection Pins (Matching your screenshot) */}
      <g transform="translate(25.5, 52)">
        {[0, 3, 6, 9].map((offset) => (
          <rect key={offset} x={offset} y="0" width="1.5" height="6" fill="#999" />
        ))}
      </g>

      {/* 3. The LEDs */}
      {Array.from({ length: pixelsCount }).map((_, i) => {
        const angleDegree = (i * 360) / pixelsCount;
        const angleRad = (angleDegree * Math.PI) / 180;
        const x = center + ringRadius * Math.sin(angleRad);
        const y = center - ringRadius * Math.cos(angleRad);

        const colorValue = state?.pixels?.[i] || 0;
        const r = (colorValue >> 16) & 0xff;
        const g = (colorValue >> 8) & 0xff;
        const b = colorValue & 0xff;

        const isActive = r > 0 || g > 0 || b > 0;
        const color = isActive ? `rgb(${r},${g},${b})` : 'rgba(255,255,255,0.1)';
        
        return (
          <g key={i} transform={`rotate(${angleDegree}, ${x}, ${y})`}>
            {/* LED Housing (The white square package) */}
            <rect
              x={x - ledSize / 2}
              y={y - ledSize / 2}
              width={ledSize}
              height={ledSize}
              rx="0.4"
              fill="#eee"
            />
            
            {/* The Silicon Die (The circle inside the LED) */}
            <circle
              cx={x}
              cy={y}
              r={ledSize / 2.8}
              fill={isActive ? color : "#bbb"}
              style={{
                filter: isActive ? `blur(0.5px) brightness(1.2)` : 'none',
                transition: 'fill 0.1s ease'
              }}
            />

            {/* Light Spill / Bloom Effect */}
            {isActive && (
              <circle
                cx={x}
                cy={y}
                r={ledSize * 1.2}
                fill={color}
                fillOpacity="0.3"
                style={{ filter: 'blur(2px)' }}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
};