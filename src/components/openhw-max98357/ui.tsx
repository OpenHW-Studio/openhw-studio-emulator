import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 75, h: 105 };

export const UI = ({ state, attrs }: { state: any, attrs: any }) => {
  return (
    <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h, pointerEvents: 'none' }}>
      <svg width={BOUNDS.w} height={BOUNDS.h} viewBox={`0 0 ${BOUNDS.w} ${BOUNDS.h}`} style={{ display: 'block', overflow: 'visible' }}>
        {/* Board Background */}
        <rect x="0" y="0" width="75" height="105" rx="4" fill="#6B0015" stroke="#42000B" strokeWidth="2" />
        
        {/* Chip */}
        <rect x="25" y="42.5" width="20" height="20" rx="2" fill="#222" />
        <text x="35" y="54" fill="#fff" fontSize="4" textAnchor="middle" fontFamily="monospace">MAX98357</text>
        
        {/* Input Pins - Left edge */}
        <g>
          {/* Pins at 7.5, 22.5, 37.5, 52.5, 67.5, 82.5, 97.5 */}
          {[7.5, 22.5, 37.5, 52.5, 67.5, 82.5, 97.5].map((y, i) => (
            <React.Fragment key={i}>
              <rect x="5" y={y - 2} width="10" height="4" fill="#E6C200" />
              <circle cx="7.5" cy={y} r="1.5" fill="#2C3E50" />
            </React.Fragment>
          ))}
          
          <text x="17" y="8.5" fill="#fff" fontSize="5" alignmentBaseline="middle">LRC</text>
          <text x="17" y="23.5" fill="#fff" fontSize="5" alignmentBaseline="middle">BCLK</text>
          <text x="17" y="38.5" fill="#fff" fontSize="5" alignmentBaseline="middle">DIN</text>
          <text x="17" y="53.5" fill="#fff" fontSize="5" alignmentBaseline="middle">GAIN</text>
          <text x="17" y="68.5" fill="#fff" fontSize="5" alignmentBaseline="middle">SD</text>
          <text x="17" y="83.5" fill="#fff" fontSize="5" alignmentBaseline="middle">GND</text>
          <text x="17" y="98.5" fill="#fff" fontSize="5" alignmentBaseline="middle">VIN</text>
        </g>

        {/* Output Terminal Block - Right edge */}
        <rect x="55" y="25" width="20" height="55" fill="#006600" />
        <circle cx="67.5" cy="37.5" r="3" fill="#aaa" />
        <circle cx="67.5" cy="67.5" r="3" fill="#aaa" />
        <text x="52" y="38.5" fill="#fff" fontSize="5" textAnchor="end" alignmentBaseline="middle">OUT+</text>
        <text x="52" y="68.5" fill="#fff" fontSize="5" textAnchor="end" alignmentBaseline="middle">OUT-</text>
      </svg>
    </div>
  );
};
