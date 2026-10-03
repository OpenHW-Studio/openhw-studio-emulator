import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 92, h: 330 };

const LEFT_LABELS = [
  'L0',
  'L1',
  'L2',
  'L3',
  'L4',
  'L5',
  'L6',
  'L7',
  'L8',
  'L9',
  'L10',
  'L11',
  'L12',
  'L13',
  'L14',
  'L15',
  'L16',
  'L17',
  'L18',
  'L19',
];
const RIGHT_LABELS = [
  'R0',
  'R1',
  'R2',
  'R3',
  'R4',
  'R5',
  'R6',
  'R7',
  'R8',
  'R9',
  'R10',
  'R11',
  'R12',
  'R13',
  'R14',
  'R15',
  'R16',
  'R17',
  'R18',
  'R19',
];

export const Openhw8051UI = ({ state, attrs }: { state: any; attrs: any }) => {
  const ledOn = state?.builtInLed ?? false;
  const txOn = !!state?.txActive;
  const rxOn = !!state?.rxActive;

  return (
    <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h }}>
      <svg
        viewBox="0 0 92 330"
        width="100%"
        height="100%"
        style={{ display: 'block' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* PCB Base */}
        <rect x="0" y="5" width="92" height="315" rx="4" fill="#1a5a2e" stroke="#001a33" strokeWidth="1" />

        {/* Headers - Left */}
        {Array.from({ length: 20 }).map((_, i) => (
          <g key={`left-pin-${i}`}>
            <circle cx="15" cy={15 + i * 15} r="2.5" fill="#f1c40f" stroke="#000" strokeWidth="0.5" />
            <circle cx="5" cy={15 + i * 15} r="1.2" fill="#000" />
          </g>
        ))}

        {/* Headers - Right */}
        {Array.from({ length: 20 }).map((_, i) => (
          <g key={`right-pin-${i}`}>
            <circle cx="75" cy={15 + i * 15} r="2.5" fill="#f1c40f" stroke="#000" strokeWidth="0.5" />
            <circle cx="75" cy={15 + i * 15} r="1.2" fill="#000" />
          </g>
        ))}

        {/* Console TX/RX activity */}
        <circle cx="30" cy="8" r="2.5" fill={txOn ? '#ffb300' : '#5a4a1a'} />
        <circle cx="38" cy="8" r="2.5" fill={rxOn ? '#38bdf8' : '#1a3a4a'} />

        {/* MCU */}
        <g transform="translate(46, 110) rotate(45)">
          <rect x="-15" y="-15" width="30" height="30" fill="#2c3e50" rx="2" />
          <text x="0" y="-3" fill="#7f8c8d" fontSize="3.5" fontFamily="monospace" textAnchor="middle" transform="rotate(-45)">8051</text>
          <text x="0" y="2" fill="#7f8c8d" fontSize="3" fontFamily="monospace" textAnchor="middle" transform="rotate(-45)">MCS-51</text>
          <circle cx="-10" cy="-10" r="1.5" fill="#1a252f" />
        </g>

        {/* Built-in LED */}
        <rect x="25" y="30" width="4" height="6" fill={ledOn ? "#2ecc71" : "#145a32"} rx="1" />

        {/* Power LED */}
        <rect x="20" y="30" width="4" height="6" fill="#e74c3c" rx="1" />

        {/* Labels Left */}
        <g fill="#ecf0f1" fontSize="4.5" fontFamily="monospace" fontWeight="bold">
          {LEFT_LABELS.map((label, i) => (
            <text key={`ll-${i}`} x="10" y={16 + i * 15}>{label}</text>
          ))}
        </g>

        {/* Labels Right */}
        <g fill="#ecf0f1" fontSize="4.5" fontFamily="monospace" fontWeight="bold" textAnchor="end">
          {RIGHT_LABELS.map((label, i) => (
            <text key={`rl-${i}`} x="82" y={16 + i * 15}>{label}</text>
          ))}
        </g>

        {/* Origin note: ORG 0000h */}
        <text x="46" y="325" fill="#7f8c8d" fontSize="3.5" fontFamily="monospace" textAnchor="middle">ORG 0000h</text>
      </svg>
    </div>
  );
};
