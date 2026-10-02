import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 140, h: 320 };

const LEFT_LABELS = [
  '5V', 'GND', '3V3', 'PA0', 'PA1', 'PA2', 'PA3', 'PA4', 'PA5', 'PA6',
  'PA7', 'PB0', 'PB1', 'PB6', 'PB7', 'PB8', 'PB9', 'RST', 'GND', '3V3',
];
const RIGHT_LABELS = [
  'GND', 'PC0', 'PC1', 'PD12', 'PD13', 'PD14', 'PD15', 'PC6', 'PC7', 'PA9',
  'PA10', 'PA11', 'PA12', 'PB12', 'PB13', 'PB14', 'PB15', 'SWD', 'SWC', 'GND',
];

export const UI_OpenhwStm32f401 = ({ state, attrs }: { state: any; attrs: any }) => {
  const ledOn = state?.builtInLed ?? false;

  return (
    <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h }}>
      <svg
        viewBox="0 0 140 320"
        width="100%"
        height="100%"
        style={{ display: 'block' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* PCB Base */}
        <rect x="0" y="5" width="140" height="305" rx="4" fill="#1a1a2e" stroke="#0d0d1a" strokeWidth="1" />

        {/* Headers - Left (x=15, y=15+i*15) */}
        {Array.from({ length: 20 }).map((_, i) => (
          <g key={`left-pin-${i}`}>
            <circle cx="15" cy={15 + i * 15} r="2.5" fill="#f1c40f" stroke="#000" strokeWidth="0.5" />
            <circle cx="15" cy={15 + i * 15} r="1.2" fill="#000" />
          </g>
        ))}

        {/* Headers - Right (x=125, y=15+i*15) */}
        {Array.from({ length: 20 }).map((_, i) => (
          <g key={`right-pin-${i}`}>
            <circle cx="125" cy={15 + i * 15} r="2.5" fill="#f1c40f" stroke="#000" strokeWidth="0.5" />
            <circle cx="125" cy={15 + i * 15} r="1.2" fill="#000" />
          </g>
        ))}

        {/* SWD Headers - Bottom */}
        {Array.from({ length: 3 }).map((_, i) => (
          <g key={`swd-pin-${i}`}>
            <circle cx={45 + i * 20} cy={312} r="2.5" fill="#bdc3c7" stroke="#000" strokeWidth="0.5" />
            <circle cx={45 + i * 20} cy={312} r="1.2" fill="#000" />
          </g>
        ))}

        {/* ST-Link section */}
        <rect x="30" y="0" width="80" height="14" fill="#95a5a6" rx="2" stroke="#7f8c8d" />
        <text x="70" y="10" fill="#2c3e50" fontSize="6" fontFamily="monospace" textAnchor="middle">ST-LINK</text>

        {/* STM32 MCU chip=stm32f401 svd=stm32f401.svd */}
        <g transform="translate(70, 130)">
          <rect x="-22" y="-22" width="44" height="44" fill="#2c3e50" rx="2" />
          {Array.from({ length: 16 }).map((_, i) => (
            <React.Fragment key={`mcu-pin-${i}`}>
              <line x1="-23" y1={-19 + i * 2.5} x2="-26" y2={-19 + i * 2.5} stroke="#bdc3c7" strokeWidth="0.6" />
              <line x1="23" y1={-19 + i * 2.5} x2="26" y2={-19 + i * 2.5} stroke="#bdc3c7" strokeWidth="0.6" />
              <line x1={-19 + i * 2.5} y1="-23" x2={-19 + i * 2.5} y2="-26" stroke="#bdc3c7" strokeWidth="0.6" />
              <line x1={-19 + i * 2.5} y1="23" x2={-19 + i * 2.5} y2="26" stroke="#bdc3c7" strokeWidth="0.6" />
            </React.Fragment>
          ))}
          <text x="0" y="-4" fill="#7f8c8d" fontSize="5" fontFamily="monospace" textAnchor="middle">STM32</text>
          <text x="0" y="3" fill="#7f8c8d" fontSize="4" fontFamily="monospace" textAnchor="middle">stm32f401</text>
          <circle cx="-16" cy="-16" r="2" fill="#1a252f" />
        </g>

        {/* Board LED (PC13) */}
        <circle cx="100" cy="200" r="3" fill={ledOn ? '#2ecc71' : '#145a32'} />
        <circle cx="108" cy="200" r="3" fill="#7d4e12" />
        <circle cx="100" cy="208" r="3" fill="#7b1f1f" />
        <circle cx="108" cy="208" r="3" fill="#1f3a7b" />
        <text x="104" y="220" fill="#7f8c8d" fontSize="4" fontFamily="monospace" textAnchor="middle">PC13</text>

        {/* User button (PA0) */}
        <rect x="58" y="230" width="24" height="10" fill="#34495e" rx="2" />
        <circle cx="70" cy="235" r="3" fill="#ecf0f1" />
        <text x="70" y="248" fill="#7f8c8d" fontSize="4" fontFamily="monospace" textAnchor="middle">USER PA0</text>

        {/* Crystal */}
        <rect x="58" y="255" width="24" height="8" fill="#bdc3c7" rx="4" />
        <text x="70" y="261" fill="#2c3e50" fontSize="4" fontFamily="monospace" textAnchor="middle">8.000</text>

        {/* Board label: STM32F401 BlackPill */}
        <text x="70" y="280" fill="#7f8c8d" fontSize="4" fontFamily="monospace" textAnchor="middle">STM32F401 BlackPill</text>

        {/* Labels Left */}
        <g fill="#ecf0f1" fontSize="4.5" fontFamily="monospace" fontWeight="bold">
          {LEFT_LABELS.map((label, i) => (
            <text key={`ll-${i}`} x="10" y={16 + i * 15}>{label}</text>
          ))}
        </g>

        {/* Labels Right */}
        <g fill="#ecf0f1" fontSize="4.5" fontFamily="monospace" fontWeight="bold" textAnchor="end">
          {RIGHT_LABELS.map((label, i) => (
            <text key={`rl-${i}`} x="130" y={16 + i * 15}>{label}</text>
          ))}
        </g>
      </svg>
    </div>
  );
};
