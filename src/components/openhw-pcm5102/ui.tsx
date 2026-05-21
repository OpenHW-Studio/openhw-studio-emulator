import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 80, h: 60 };

export const UI = ({ state, attrs }: { state: any, attrs: any }) => {
  const peakAmplitude = (state?.peakAmplitude as number) || 0;
  
  // A simple visual indicator (e.g. an LED) that flashes based on audio amplitude
  const ledBrightness = Math.min(1, peakAmplitude * 2);

  return (
    <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h, pointerEvents: 'none' }}>
      <svg width={BOUNDS.w} height={BOUNDS.h} viewBox={`0 0 ${BOUNDS.w} ${BOUNDS.h}`} style={{ display: 'block', overflow: 'visible' }}>
        {/* Board Background */}
        <rect x="0" y="0" width="80" height="60" rx="4" fill="#4B0082" stroke="#2B0042" strokeWidth="2" />
        
        {/* Chip */}
        <rect x="25" y="15" width="30" height="30" rx="2" fill="#222" />
        <text x="40" y="30" fill="#fff" fontSize="6" textAnchor="middle" fontFamily="monospace">PCM5102</text>
        
        {/* Activity LED */}
        <circle cx="65" cy="15" r="4" fill={`rgba(0, 255, 0, ${ledBrightness})`} stroke="#004400" />
        
        {/* Pins - Top edge */}
        <g transform="translate(10, 0)">
          <rect x="0" y="-5" width="4" height="10" fill="#E6C200" />
          <rect x="10" y="-5" width="4" height="10" fill="#E6C200" />
          <rect x="20" y="-5" width="4" height="10" fill="#E6C200" />
          <rect x="30" y="-5" width="4" height="10" fill="#E6C200" />
          <rect x="40" y="-5" width="4" height="10" fill="#E6C200" />
          <rect x="50" y="-5" width="4" height="10" fill="#E6C200" />
          
          <text x="2" y="12" fill="#fff" fontSize="5" textAnchor="middle">VCC</text>
          <text x="12" y="12" fill="#fff" fontSize="5" textAnchor="middle">GND</text>
          <text x="22" y="12" fill="#fff" fontSize="5" textAnchor="middle">FLT</text>
          <text x="32" y="12" fill="#fff" fontSize="5" textAnchor="middle">DMP</text>
          <text x="42" y="12" fill="#fff" fontSize="5" textAnchor="middle">XMT</text>
          <text x="52" y="12" fill="#fff" fontSize="5" textAnchor="middle">FMT</text>
        </g>

        {/* Pins - Bottom edge */}
        <g transform="translate(10, 55)">
          <rect x="0" y="-5" width="4" height="10" fill="#E6C200" />
          <rect x="10" y="-5" width="4" height="10" fill="#E6C200" />
          <rect x="20" y="-5" width="4" height="10" fill="#E6C200" />
          <rect x="30" y="-5" width="4" height="10" fill="#E6C200" />
          <rect x="40" y="-5" width="4" height="10" fill="#E6C200" />
          <rect x="50" y="-5" width="4" height="10" fill="#E6C200" />

          <text x="2" y="-8" fill="#fff" fontSize="5" textAnchor="middle">SCK</text>
          <text x="12" y="-8" fill="#fff" fontSize="5" textAnchor="middle">BCK</text>
          <text x="22" y="-8" fill="#fff" fontSize="5" textAnchor="middle">DIN</text>
          <text x="32" y="-8" fill="#fff" fontSize="5" textAnchor="middle">LCK</text>
          <text x="42" y="-8" fill="#fff" fontSize="5" textAnchor="middle">OUTL</text>
          <text x="52" y="-8" fill="#fff" fontSize="5" textAnchor="middle">OUTR</text>
        </g>
      </svg>
    </div>
  );
};
