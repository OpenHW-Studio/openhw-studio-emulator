import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 60, h: 70 };

export const UI = ({ state, attrs }: { state: any, attrs: any }) => {
  return (
    <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h, pointerEvents: 'none' }}>
      <svg width={BOUNDS.w} height={BOUNDS.h} viewBox={`0 0 ${BOUNDS.w} ${BOUNDS.h}`} style={{ display: 'block', overflow: 'visible' }}>
        {/* Board Background */}
        <rect x="0" y="0" width="60" height="70" rx="4" fill="#6B0015" stroke="#42000B" strokeWidth="2" />
        
        {/* Chip */}
        <rect x="20" y="25" width="20" height="20" rx="2" fill="#222" />
        <text x="30" y="37" fill="#fff" fontSize="4" textAnchor="middle" fontFamily="monospace">MAX98357</text>
        
        {/* Input Pins - Left edge */}
        <g transform="translate(0, 5)">
          <rect x="-5" y="0" width="10" height="4" fill="#E6C200" />
          <rect x="-5" y="10" width="10" height="4" fill="#E6C200" />
          <rect x="-5" y="20" width="10" height="4" fill="#E6C200" />
          <rect x="-5" y="30" width="10" height="4" fill="#E6C200" />
          <rect x="-5" y="40" width="10" height="4" fill="#E6C200" />
          <rect x="-5" y="50" width="10" height="4" fill="#E6C200" />
          <rect x="-5" y="60" width="10" height="4" fill="#E6C200" />
          
          <text x="7" y="3" fill="#fff" fontSize="4" alignmentBaseline="middle">LRC</text>
          <text x="7" y="13" fill="#fff" fontSize="4" alignmentBaseline="middle">BCLK</text>
          <text x="7" y="23" fill="#fff" fontSize="4" alignmentBaseline="middle">DIN</text>
          <text x="7" y="33" fill="#fff" fontSize="4" alignmentBaseline="middle">GAIN</text>
          <text x="7" y="43" fill="#fff" fontSize="4" alignmentBaseline="middle">SD</text>
          <text x="7" y="53" fill="#fff" fontSize="4" alignmentBaseline="middle">GND</text>
          <text x="7" y="63" fill="#fff" fontSize="4" alignmentBaseline="middle">VIN</text>
        </g>

        {/* Output Terminal Block - Right edge */}
        <rect x="45" y="20" width="15" height="30" fill="#006600" />
        <circle cx="52" cy="27" r="3" fill="#aaa" />
        <circle cx="52" cy="43" r="3" fill="#aaa" />
        <text x="42" y="27" fill="#fff" fontSize="4" textAnchor="end" alignmentBaseline="middle">OUT+</text>
        <text x="42" y="43" fill="#fff" fontSize="4" textAnchor="end" alignmentBaseline="middle">OUT-</text>
      </svg>
    </div>
  );
};
