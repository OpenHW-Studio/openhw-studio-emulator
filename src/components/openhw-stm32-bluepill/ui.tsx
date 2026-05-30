import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 92, h: 330 };

export const STM32BluePillUI = ({ state, attrs }: { state: any; attrs: any }) => {
  const ledOn = state?.builtInLed ?? false;

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
        <rect x="0" y="5" width="92" height="315" rx="4" fill="#003366" stroke="#001a33" strokeWidth="1" />
        
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
            <circle cx="77" cy={15 + i * 15} r="2.5" fill="#f1c40f" stroke="#000" strokeWidth="0.5" />
            <circle cx="77" cy={15 + i * 15} r="1.2" fill="#000" />
          </g>
        ))}

        {/* SWD Headers - Bottom */}
        {Array.from({ length: 4 }).map((_, i) => (
          <g key={`swd-pin-${i}`}>
            <circle cx={31 + i * 10} cy={315} r="2.5" fill="#bdc3c7" stroke="#000" strokeWidth="0.5" />
            <circle cx={31 + i * 10} cy={315} r="1.2" fill="#000" />
          </g>
        ))}
        
        {/* Micro USB Port */}
        <rect x="31" y="0" width="30" height="15" fill="#95a5a6" rx="2" stroke="#7f8c8d" />
        <rect x="35" y="0" width="22" height="8" fill="#ecf0f1" />
        <line x1="35" y1="8" x2="57" y2="8" stroke="#34495e" strokeWidth="1" />
        
        {/* Reset Button */}
        <rect x="35" y="45" width="12" height="12" fill="#34495e" rx="2" />
        <circle cx="41" cy="51" r="4" fill="#ecf0f1" />
        
        {/* BOOT0 / BOOT1 Jumpers */}
        <rect x="52" y="45" width="6" height="12" fill="#f1c40f" rx="1" />
        <rect x="60" y="45" width="6" height="12" fill="#f1c40f" rx="1" />
        <circle cx="55" cy="48" r="1" fill="#000" />
        <circle cx="55" cy="54" r="1" fill="#000" />
        <circle cx="63" cy="48" r="1" fill="#000" />
        <circle cx="63" cy="54" r="1" fill="#000" />
        
        {/* STM32 Microcontroller */}
        <g transform="translate(46, 110) rotate(45)">
          <rect x="-15" y="-15" width="30" height="30" fill="#2c3e50" rx="2" />
          {/* Pins on MCU */}
          {Array.from({ length: 12 }).map((_, i) => (
            <React.Fragment key={`mcu-pin-${i}`}>
              <line x1="-16" y1={-11 + i * 2} x2="-18" y2={-11 + i * 2} stroke="#bdc3c7" strokeWidth="0.5" />
              <line x1="16" y1={-11 + i * 2} x2="18" y2={-11 + i * 2} stroke="#bdc3c7" strokeWidth="0.5" />
              <line x1={-11 + i * 2} y1="-16" x2={-11 + i * 2} y2="-18" stroke="#bdc3c7" strokeWidth="0.5" />
              <line x1={-11 + i * 2} y1="16" x2={-11 + i * 2} y2="18" stroke="#bdc3c7" strokeWidth="0.5" />
            </React.Fragment>
          ))}
          {/* Chip Label */}
          <text x="0" y="-3" fill="#7f8c8d" fontSize="3.5" fontFamily="monospace" textAnchor="middle" transform="rotate(-45)">STM32</text>
          <text x="0" y="2" fill="#7f8c8d" fontSize="3" fontFamily="monospace" textAnchor="middle" transform="rotate(-45)">F103C8T6</text>
          <circle cx="-10" cy="-10" r="1.5" fill="#1a252f" />
        </g>
        
        {/* Crystal Oscillator */}
        <rect x="36" y="145" width="20" height="8" fill="#bdc3c7" rx="4" />
        <text x="46" y="150" fill="#2c3e50" fontSize="4" fontFamily="monospace" textAnchor="middle">8.000</text>
        
        {/* Built-in LED (PC13) */}
        <rect x="25" y="30" width="4" height="6" fill={ledOn ? "#2ecc71" : "#145a32"} rx="1" />
        
        {/* Power LED */}
        <rect x="20" y="30" width="4" height="6" fill="#e74c3c" rx="1" />

        {/* Labels Left */}
        <g fill="#ecf0f1" fontSize="4.5" fontFamily="monospace" fontWeight="bold">
          <text x="10" y="16">VBAT</text>
          <text x="10" y="31">PC13</text>
          <text x="10" y="46">PC14</text>
          <text x="10" y="61">PC15</text>
          <text x="10" y="76">PA0</text>
          <text x="10" y="91">PA1</text>
          <text x="10" y="106">PA2</text>
          <text x="10" y="121">PA3</text>
          <text x="10" y="136">PA4</text>
          <text x="10" y="151">PA5</text>
          <text x="10" y="166">PA6</text>
          <text x="10" y="181">PA7</text>
          <text x="10" y="196">PB0</text>
          <text x="10" y="211">PB1</text>
          <text x="10" y="226">PB10</text>
          <text x="10" y="241">PB11</text>
          <text x="10" y="256">RST</text>
          <text x="10" y="271">3V3</text>
          <text x="10" y="286">GND</text>
          <text x="10" y="301">GND</text>
        </g>
        
        {/* Labels Right */}
        <g fill="#ecf0f1" fontSize="4.5" fontFamily="monospace" fontWeight="bold" textAnchor="end">
          <text x="82" y="16">3V3</text>
          <text x="82" y="31">GND</text>
          <text x="82" y="46">5V</text>
          <text x="82" y="61">PB9</text>
          <text x="82" y="76">PB8</text>
          <text x="82" y="91">PB7</text>
          <text x="82" y="106">PB6</text>
          <text x="82" y="121">PB5</text>
          <text x="82" y="136">PB4</text>
          <text x="82" y="151">PB3</text>
          <text x="82" y="166">PA15</text>
          <text x="82" y="181">PA12</text>
          <text x="82" y="196">PA11</text>
          <text x="82" y="211">PA10</text>
          <text x="82" y="226">PA9</text>
          <text x="82" y="241">PA8</text>
          <text x="82" y="256">PB15</text>
          <text x="82" y="271">PB14</text>
          <text x="82" y="286">PB13</text>
          <text x="82" y="301">PB12</text>
        </g>
        
      </svg>
    </div>
  );
};
