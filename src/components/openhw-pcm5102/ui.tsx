import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 90, h: 60 };

export const UI = ({ state, attrs }: { state: any, attrs: any }) => {
  const peakAmplitude = (state?.peakAmplitude as number) || 0;
  
  // A simple visual indicator (e.g. an LED) that flashes based on audio amplitude
  const ledBrightness = Math.min(1, peakAmplitude * 2);

  return (
    <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h, pointerEvents: 'none' }}>
      <svg width={BOUNDS.w} height={BOUNDS.h} viewBox={`0 0 ${BOUNDS.w} ${BOUNDS.h}`} style={{ display: 'block', overflow: 'visible' }}>
        {/* Board Background */}
        <rect x="0" y="0" width="90" height="60" rx="4" fill="#4B0082" stroke="#2B0042" strokeWidth="2" />
        
        {/* Chip */}
        <rect x="30" y="15" width="30" height="30" rx="2" fill="#222" />
        <text x="45" y="30" fill="#fff" fontSize="6" textAnchor="middle" fontFamily="monospace">PCM5102</text>
        
        {/* Activity LED */}
        <circle cx="75" cy="30" r="4" fill={`rgba(0, 255, 0, ${ledBrightness})`} stroke="#004400" />
        
        {/* Pins - Top edge */}
        <g>
          {[7.5, 22.5, 37.5, 52.5, 67.5, 82.5].map((x, i) => (
            <React.Fragment key={i}>
              <rect x={x - 2} y="0" width="4" height="7.5" fill="#E6C200" />
              <circle cx={x} cy="7.5" r="1.5" fill="#2C3E50" />
            </React.Fragment>
          ))}
          
          <text x="7.5" y="14" fill="#fff" fontSize="4" textAnchor="middle">VCC</text>
          <text x="22.5" y="14" fill="#fff" fontSize="4" textAnchor="middle">GND</text>
          <text x="37.5" y="14" fill="#fff" fontSize="4" textAnchor="middle">FLT</text>
          <text x="52.5" y="14" fill="#fff" fontSize="4" textAnchor="middle">DMP</text>
          <text x="67.5" y="14" fill="#fff" fontSize="4" textAnchor="middle">XMT</text>
          <text x="82.5" y="14" fill="#fff" fontSize="4" textAnchor="middle">FMT</text>
        </g>

        {/* Pins - Bottom edge */}
        <g>
          {[7.5, 22.5, 37.5, 52.5, 67.5, 82.5].map((x, i) => (
            <React.Fragment key={i}>
              <rect x={x - 2} y="52.5" width="4" height="7.5" fill="#E6C200" />
              <circle cx={x} cy="52.5" r="1.5" fill="#2C3E50" />
            </React.Fragment>
          ))}

          <text x="7.5" y="48" fill="#fff" fontSize="4" textAnchor="middle">SCK</text>
          <text x="22.5" y="48" fill="#fff" fontSize="4" textAnchor="middle">BCK</text>
          <text x="37.5" y="48" fill="#fff" fontSize="4" textAnchor="middle">DIN</text>
          <text x="52.5" y="48" fill="#fff" fontSize="4" textAnchor="middle">LCK</text>
          <text x="67.5" y="48" fill="#fff" fontSize="4" textAnchor="middle">OUTL</text>
          <text x="82.5" y="48" fill="#fff" fontSize="4" textAnchor="middle">OUTR</text>
        </g>
      </svg>
    </div>
  );
};
