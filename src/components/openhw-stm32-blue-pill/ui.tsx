import React from 'react';

const BOARD_W = 170;
const BOARD_H = 440;
const PIN_PITCH = 19;
const TOP_PIN_Y = 56;
const CORNER_RADIUS = 6;
const PCB_COLOR = "#0b5ea8";
const PCB_STROKE = "#083b6b";

export const BOUNDS = { x: 0, y: 0, w: BOARD_W, h: BOARD_H };

export const BluePillUI = ({ state, attrs }: { state: any; attrs: any }) => {
  const ledOn = state?.builtInLed ?? false;

  const LEFT_PAD_X = 22;
  const LEFT_LABEL_X = 7;
  const RIGHT_PAD_X = BOARD_W - 22;
  const RIGHT_LABEL_X = BOARD_W - 7;

  const leftLabels = [
    "B12","B13","B14","B15",
    "A8","A9","A10","A11",
    "A12","A15","B3","B4",
    "B5","B6","B7","B8",
    "B9","5V","G","3.3"
  ];
  const rightLabels = [
    "G","G","3.3","R","B11",
    "B10","B1","B0","A7",
    "A6","A5","A4","A3",
    "A2","A1","A0","C15",
    "C14","C13","VB"
  ];

  return (
    <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h }}>
      <svg
        viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
        width="100%"
        height="100%"
        style={{ display: 'block', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.25))' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect 
          x="0" y="0" 
          width={BOARD_W} height={BOARD_H} 
          rx={CORNER_RADIUS} 
          fill={PCB_COLOR} 
          stroke={PCB_STROKE} 
          strokeWidth="1.5" 
        />

        {/* USB Connector */}
        <g transform={`translate(${BOARD_W / 2 - 27}, -2)`}>
          <rect x="0" y="2" width="54" height="18" fill="#cbd5e1" rx="2" />
          <rect x="7" y="0" width="40" height="12" fill="#94a3b8" />
          <rect x="12" y="-2" width="30" height="4" fill="#64748b" />
          <line x1="20" y1="-2" x2="20" y2="4" stroke="#0f172a" strokeWidth="1" />
          <line x1="25" y1="-2" x2="25" y2="4" stroke="#0f172a" strokeWidth="1" />
          <line x1="30" y1="-2" x2="30" y2="4" stroke="#0f172a" strokeWidth="1" />
          <line x1="35" y1="-2" x2="35" y2="4" stroke="#0f172a" strokeWidth="1" />
        </g>

        {/* Outer White Rails */}
        <rect x="12" y="44" width="20" height={BOARD_H - 66} fill="none" stroke="#dbeafe" strokeWidth="1" />
        <rect x={BOARD_W - 32} y="44" width="20" height={BOARD_H - 66} fill="none" stroke="#dbeafe" strokeWidth="1" />

        {/* BOOT Jumpers */}
        <g transform="translate(85, 45)">
          <rect x="0" y="0" width="32" height="38" fill="#eab308" rx="1" />
          <circle cx="9" cy="8" r="2.5" fill="#1e293b" />
          <circle cx="9" cy="19" r="2.5" fill="#1e293b" />
          <circle cx="9" cy="30" r="2.5" fill="#1e293b" />
          <circle cx="23" cy="8" r="2.5" fill="#1e293b" />
          <circle cx="23" cy="19" r="2.5" fill="#1e293b" />
          <circle cx="23" cy="30" r="2.5" fill="#1e293b" />
          
          {/* Jumper caps */}
          <rect x="5" y="15" width="8" height="18" fill="#ea580c" rx="1" />
          <rect x="19" y="4" width="8" height="18" fill="#ea580c" rx="1" />

          <text x="9" y="-4" fill="#ffffff" fontSize="6" fontFamily="Arial" fontWeight="600" textAnchor="middle" transform="rotate(90, 9, -4)">0</text>
          <text x="23" y="-4" fill="#ffffff" fontSize="6" fontFamily="Arial" fontWeight="600" textAnchor="middle" transform="rotate(90, 23, -4)">0</text>
          <text x="9" y="44" fill="#ffffff" fontSize="6" fontFamily="Arial" fontWeight="600" textAnchor="middle" transform="rotate(90, 9, 44)">1</text>
          <text x="23" y="44" fill="#ffffff" fontSize="6" fontFamily="Arial" fontWeight="600" textAnchor="middle" transform="rotate(90, 23, 44)">1</text>

          <text x="-8" y="19" fill="#ffffff" fontSize="7" fontFamily="Arial" fontWeight="600" letterSpacing="0.3" textAnchor="middle" transform="rotate(90, -8, 19)">BOOT1</text>
          <text x="40" y="19" fill="#ffffff" fontSize="7" fontFamily="Arial" fontWeight="600" letterSpacing="0.3" textAnchor="middle" transform="rotate(90, 40, 19)">BOOT0</text>
        </g>

        {/* Reset Button */}
        <g transform="translate(42, 50)">
          <rect x="0" y="0" width="16" height="28" fill="#94a3b8" rx="2" />
          <rect x="3" y="5" width="10" height="18" fill="#f8fafc" rx="1" />
          <text x="8" y="46" fill="#ffffff" fontSize="7" fontFamily="Arial" fontWeight="600" letterSpacing="0.3" textAnchor="middle" transform="rotate(-90, 8, 46)">RESET</text>
        </g>

        {/* MCU Placement */}
        <g transform={`translate(${BOARD_W / 2 + 2}, 190)`}>
          <g transform="rotate(-45)">
            <rect x="-26" y="-26" width="52" height="52" fill="#2d3748" stroke="#1a202c" strokeWidth="1" rx="2" filter="drop-shadow(2px 2px 2px rgba(0,0,0,0.3))" />
            <circle cx="-18" cy="-18" r="2" fill="#171923" />
            
            {Array.from({ length: 12 }).map((_, i) => (
              <React.Fragment key={`mcu-pin-${i}`}>
                <line x1="-26" y1={-16.5 + i * 3} x2="-30" y2={-16.5 + i * 3} stroke="#94a3b8" strokeWidth="1" />
                <line x1="26" y1={-16.5 + i * 3} x2="30" y2={-16.5 + i * 3} stroke="#94a3b8" strokeWidth="1" />
                <line x1={-16.5 + i * 3} y1="-26" x2={-16.5 + i * 3} y2="-30" stroke="#94a3b8" strokeWidth="1" />
                <line x1={-16.5 + i * 3} y1="26" x2={-16.5 + i * 3} y2="30" stroke="#94a3b8" strokeWidth="1" />
              </React.Fragment>
            ))}

            <text x="0" y="-8" fill="#a0aec0" fontSize="7" fontFamily="Arial" fontWeight="600" textAnchor="middle" transform="rotate(-90)">STM32</text>
            <text x="0" y="2" fill="#a0aec0" fontSize="6" fontFamily="Arial" fontWeight="600" textAnchor="middle" transform="rotate(-90)">F103C8T6</text>
            <text x="0" y="10" fill="#718096" fontSize="5" fontFamily="Arial" textAnchor="middle" transform="rotate(-90)">991KA 93</text>
            <path d="M -15,-18 L -10,-24 L -5,-18 L -10,-12 Z" fill="none" stroke="#a0aec0" strokeWidth="1" transform="rotate(-90)" />
          </g>
          
          <text x="-52" y="0" fill="#ffffff" fontSize="12" fontFamily="Arial" fontWeight="600" letterSpacing="0.3" textAnchor="middle" transform="rotate(90, -52, 0)">STM32</text>
          <text x="44" y="0" fill="#ffffff" fontSize="8" fontFamily="Arial" fontWeight="600" textAnchor="middle" transform="rotate(90, 44, 0)">U2</text>
        </g>

        {/* Crystal Oscillator */}
        <g transform={`translate(${BOARD_W / 2 + 2}, 275)`}>
          <rect x="-28" y="-10" width="56" height="20" fill="#94a3b8" stroke="#cbd5e1" strokeWidth="1.5" rx="10" />
          <rect x="-22" y="-6" width="44" height="12" fill="#cbd5e1" rx="6" />
          <text x="0" y="3" fill="#334155" fontSize="8" fontFamily="Arial" fontWeight="600" textAnchor="middle">8.000</text>
          <text x="44" y="0" fill="#ffffff" fontSize="8" fontFamily="Arial" fontWeight="600" textAnchor="middle" transform="rotate(90, 44, 0)">Y2</text>
        </g>

        {/* LEDs */}
        <g transform={`translate(${BOARD_W / 2 + 2}, 335)`}>
          <rect x="-16" y="-10" width="32" height="20" fill="#1e293b" rx="1" />
          <rect x="-18" y="-4" width="4" height="3" fill="#cbd5e1" />
          <rect x="-18" y="1" width="4" height="3" fill="#cbd5e1" />
          <rect x="14" y="-1" width="4" height="3" fill="#cbd5e1" />
          
          <rect x="-16" y="20" width="10" height="6" fill={ledOn ? '#22c55e' : '#14532d'} rx="1" />
          <rect x="6" y="20" width="10" height="6" fill="#ef4444" rx="1" />
          
          <text x="-34" y="-2" fill="#ffffff" fontSize="7" fontFamily="Arial" fontWeight="600" letterSpacing="0.3" textAnchor="middle" transform="rotate(90, -34, -2)">PC13</text>
          <text x="44" y="23" fill="#ffffff" fontSize="7" fontFamily="Arial" fontWeight="600" letterSpacing="0.3" textAnchor="middle" transform="rotate(90, 44, 23)">PWR</text>
        </g>

        {/* Pin Rails */}
        {(() => {
          return (
            <g>
              {leftLabels.map((lab, i) => {
                const y = TOP_PIN_Y + i * PIN_PITCH;
                return (
                  <g key={`left-pin-${i}`}>
                    <line x1={LEFT_LABEL_X + 12} y1={y} x2={LEFT_PAD_X - 6} y2={y} stroke="#dbeafe" strokeWidth="0.7" />
                    <circle cx={LEFT_PAD_X} cy={y} r={5} fill="#e5e7eb" />
                    <circle cx={LEFT_PAD_X} cy={y} r={2.2} fill="#111827" />
                    <circle cx={LEFT_PAD_X} cy={y} r={10} opacity={0} />
                    <text x={LEFT_LABEL_X} y={y} fill="#ffffff" fontSize="5.5" fontFamily="Arial" fontWeight="600" letterSpacing="0.3" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }} dominantBaseline="central" textAnchor="middle">{lab}</text>
                  </g>
                );
              })}

              {rightLabels.map((lab, i) => {
                const y = TOP_PIN_Y + i * PIN_PITCH;
                return (
                  <g key={`right-pin-${i}`}>
                    <line x1={RIGHT_PAD_X + 6} y1={y} x2={RIGHT_LABEL_X - 12} y2={y} stroke="#dbeafe" strokeWidth="0.7" />
                    <circle cx={RIGHT_PAD_X} cy={y} r={5} fill="#e5e7eb" />
                    <circle cx={RIGHT_PAD_X} cy={y} r={2.2} fill="#111827" />
                    <circle cx={RIGHT_PAD_X} cy={y} r={10} opacity={0} />
                    <text x={RIGHT_LABEL_X} y={y} fill="#ffffff" fontSize="5.5" fontFamily="Arial" fontWeight="600" letterSpacing="0.3" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }} dominantBaseline="central" textAnchor="middle">{lab}</text>
                  </g>
                );
              })}
            </g>
          );
        })()}
      </svg>
    </div>
  );
};
