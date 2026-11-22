import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 92, h: 330 };

// Left column silkscreen: 20 rows, y = 15 + i*15, text y = 16 + i*15
const LEFT_LABELS = [
  'VBAT', 'PC13', 'PC14', 'PC15', 'PA0', 'PA1', 'PA2', 'PA3', 'PA4', 'PA5',
  'PA6', 'PA7', 'PB0', 'PB1', 'PB10', 'PB11', 'RST', '3V3', 'GND', 'GND',
];
// Right column silkscreen: 20 rows
const RIGHT_LABELS = [
  '3V3', 'GND', '5V', 'PB9', 'PB8', 'PB7', 'PB6', 'PB5', 'PB4', 'PB3',
  'PA15', 'PA12', 'PA11', 'PA10', 'PA9', 'PA8', 'PB15', 'PB14', 'PB13', 'PB12',
];

export const UI_OpenhwStm32Gd32f103rb = ({ state, attrs }: { state: any; attrs: any }) => {
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
        <defs>
          {/* PCB soldermask micro-texture */}
          <pattern id="bp-mask" width="3" height="3" patternUnits="userSpaceOnUse">
            <rect width="3" height="3" fill="#003a73" />
            <circle cx="1" cy="1" r="0.35" fill="#00417f" />
          </pattern>
          {/* Brushed-metal USB shell */}
          <linearGradient id="bp-usb" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dfe6ec" />
            <stop offset="0.45" stopColor="#aeb9c2" />
            <stop offset="0.55" stopColor="#8e9aa4" />
            <stop offset="1" stopColor="#c3ccd3" />
          </linearGradient>
          {/* Gold header sheen */}
          <radialGradient id="bp-gold" cx="0.35" cy="0.3" r="1">
            <stop offset="0" stopColor="#ffe9a3" />
            <stop offset="0.55" stopColor="#f1c40f" />
            <stop offset="1" stopColor="#9a7603" />
          </radialGradient>
          {/* MCU top bevel */}
          <linearGradient id="bp-mcu" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3b5068" />
            <stop offset="0.5" stopColor="#2c3e50" />
            <stop offset="1" stopColor="#1d2a38" />
          </linearGradient>
        </defs>

        {/* ===== PCB base: blue soldermask + texture + edge rail ===== */}
        <rect x="0" y="5" width="92" height="315" rx="4" fill="#003366" stroke="#001a33" strokeWidth="1" />
        <rect x="0" y="5" width="92" height="315" rx="4" fill="url(#bp-mask)" opacity="0.55" />
        <rect x="1.5" y="6.5" width="89" height="312" rx="3" fill="none" stroke="#0a4d99" strokeWidth="0.5" opacity="0.7" />
        {/* mounting hole bottom-left */}
        <circle cx="6" cy="312" r="2.6" fill="#001a33" stroke="#c9a227" strokeWidth="0.8" />
        <circle cx="6" cy="312" r="1" fill="#000" />

        {/* ===== Micro USB port (top, straddles PCB edge): outer shell + inner tongue ===== */}
        <rect x="33" y="0" width="26" height="15" fill="url(#bp-usb)" rx="2" stroke="#5d6d7e" strokeWidth="0.8" />
        <rect x="33" y="0" width="26" height="4" fill="#eef1f4" opacity="0.55" />
        <rect x="36" y="5" width="20" height="7" fill="#1a252f" rx="0.8" />
        <rect x="36" y="5" width="20" height="7" fill="none" stroke="#ecf0f1" strokeWidth="0.5" opacity="0.7" />
        {[39, 42.5, 46, 49.5, 53].map((x) => (
          <rect key={`usb-c-${x}`} x={x} y={9.5} width="1.6" height="1.6" fill="#f1c40f" />
        ))}
        <line x1="36" y1="12.2" x2="56" y2="12.2" stroke="#34495e" strokeWidth="0.7" />

        {/* ===== Reset button: body + plunger + shadow ===== */}
        <ellipse cx="41" cy="58.5" rx="7" ry="1.6" fill="#000" opacity="0.35" />
        <rect x="35" y="45" width="12" height="12" fill="#8a939c" rx="2" stroke="#5d6d7e" strokeWidth="0.7" />
        <rect x="36.5" y="46.5" width="9" height="9" fill="#232a33" rx="1.2" />
        <circle cx="41" cy="51" r="3.4" fill="#dfe3e8" stroke="#2c3e50" strokeWidth="0.6" />
        <circle cx="41" cy="51" r="1.4" fill="#9aa4ae" />
        <text x="41" y="62.5" fill="#9fb3c8" fontSize="3" fontFamily="monospace" textAnchor="middle">RESET</text>

        {/* ===== BOOT0 / BOOT1 jumper blocks ===== */}
        <ellipse cx="55" cy="58.5" rx="4" ry="1.2" fill="#000" opacity="0.3" />
        <ellipse cx="63" cy="58.5" rx="4" ry="1.2" fill="#000" opacity="0.3" />
        <rect x="52" y="45" width="6" height="12" fill="#e8b10f" rx="1" stroke="#000" strokeWidth="0.5" />
        <rect x="60" y="45" width="6" height="12" fill="#e8b10f" rx="1" stroke="#000" strokeWidth="0.5" />
        <rect x="53" y="46" width="4" height="4" fill="#f1c40f" stroke="#9a7603" strokeWidth="0.4" />
        <rect x="53" y="52" width="4" height="4" fill="#f1c40f" stroke="#9a7603" strokeWidth="0.4" />
        <rect x="61" y="46" width="4" height="4" fill="#f1c40f" stroke="#9a7603" strokeWidth="0.4" />
        <rect x="61" y="52" width="4" height="4" fill="#f1c40f" stroke="#9a7603" strokeWidth="0.4" />
        <text x="52" y="43" fill="#9fb3c8" fontSize="2.6" fontFamily="monospace" textAnchor="middle">B0</text>
        <text x="60" y="43" fill="#9fb3c8" fontSize="2.6" fontFamily="monospace" textAnchor="middle">B1</text>

        {/* ===== Copper traces (left rail -> MCU, right rail -> MCU) ===== */}
        <g stroke="#0a4d99" strokeWidth="0.7" opacity="0.9" fill="none">
          <path d="M18 75 H24 V100 H31" />
          <path d="M18 165 H24 V130 H31" />
          <path d="M18 210 H25 V190 H31" />
          <path d="M74 75 H68 V100 H61" />
          <path d="M74 165 H68 V130 H61" />
          <path d="M74 225 H67 V205 H61" />
        </g>
        <g fill="#0a4d99" opacity="0.9">
          <circle cx="24" cy="100" r="1" />
          <circle cx="24" cy="130" r="1" />
          <circle cx="68" cy="100" r="1" />
          <circle cx="68" cy="130" r="1" />
        </g>

        {/* ===== STM32GD32F103RB QFP48 (diamond) with bevel + pin-1 dot ===== */}
        <g transform="translate(46, 110) rotate(45)">
          <rect x="-16.5" y="-16.5" width="33" height="33" fill="#000" opacity="0.35" rx="3" />
          <rect x="-15" y="-15" width="30" height="30" fill="url(#bp-mcu)" rx="2" stroke="#10161d" strokeWidth="0.7" />
          {Array.from({ length: 12 }).map((_, i) => (
            <React.Fragment key={`mcu-pin-${i}`}>
              <line x1="-16" y1={-11 + i * 2} x2="-19" y2={-11 + i * 2} stroke="#d5d8dc" strokeWidth="0.7" />
              <line x1="16" y1={-11 + i * 2} x2="19" y2={-11 + i * 2} stroke="#d5d8dc" strokeWidth="0.7" />
              <line x1={-11 + i * 2} y1="-16" x2={-11 + i * 2} y2="-19" stroke="#d5d8dc" strokeWidth="0.7" />
              <line x1={-11 + i * 2} y1="16" x2={-11 + i * 2} y2="19" stroke="#d5d8dc" strokeWidth="0.7" />
            </React.Fragment>
          ))}
          <text x="0" y="-4.5" fill="#aeb6bf" fontSize="3.5" fontFamily="monospace" textAnchor="middle" transform="rotate(-45)">STM32</text>
          <text x="0" y="0.5" fill="#aeb6bf" fontSize="3" fontFamily="monospace" textAnchor="middle" transform="rotate(-45)">GD32F103RB</text>
          <circle cx="-10" cy="-10" r="1.8" fill="#10161d" stroke="#5d6d7e" strokeWidth="0.4" />
        </g>

        {/* ===== 8MHz crystal can + pads ===== */}
        <rect x="33" y="145" width="5" height="3" fill="#c9a227" />
        <rect x="54" y="145" width="5" height="3" fill="#c9a227" />
        <rect x="36" y="145" width="20" height="8" fill="#c7ced5" rx="4" stroke="#7f8c8d" strokeWidth="0.7" />
        <rect x="36" y="145" width="20" height="3.5" fill="#eef1f4" rx="1.7" opacity="0.8" />
        <text x="46" y="151" fill="#2c3e50" fontSize="3.6" fontFamily="monospace" textAnchor="middle">8.000</text>

        {/* ===== 32.768kHz RTC crystal (small can, lower right of MCU) ===== */}
        <rect x="56" y="128" width="10" height="4.5" fill="#c7ced5" rx="2.2" stroke="#7f8c8d" strokeWidth="0.5" />
        <text x="61" y="131.4" fill="#2c3e50" fontSize="2.4" fontFamily="monospace" textAnchor="middle">32k</text>

        {/* ===== Voltage regulator SOT-223 + caps ===== */}
        <rect x="52" y="188" width="12" height="9" fill="#1c2833" rx="1" stroke="#0c0e11" strokeWidth="0.5" />
        <rect x="54" y="190" width="8" height="5" fill="#2e4053" />
        {[53, 57, 61].map((x) => (
          <rect key={`vreg-${x}`} x={x} y={197} width="2" height="3" fill="#c9a227" />
        ))}
        <rect x="46" y="200" width="6" height="10" fill="#8e6e2f" rx="1" stroke="#5d4a12" strokeWidth="0.4" />
        <rect x="46" y="200" width="6" height="2" fill="#c9a227" />
        <rect x="56" y="200" width="6" height="10" fill="#8e6e2f" rx="1" stroke="#5d4a12" strokeWidth="0.4" />
        <rect x="56" y="200" width="6" height="2" fill="#c9a227" />

        {/* ===== LEDs: power (red, always) + built-in (green, dynamic) with glow ===== */}
        <rect x="24" y="19" width="5" height="7" fill="#7b1f1f" rx="1" />
        <rect x="25" y="20" width="4" height="6" fill="#e74c3c" rx="1" />
        <rect x="25" y="20" width="4" height="2" fill="#ff8a7a" rx="1" opacity="0.85" />
        <rect x="30" y="19" width="5" height="7" fill="#0e3a22" rx="1" />
        <rect x="31" y="20" width="4" height="6" fill={ledOn ? '#2ecc71' : '#145a32'} rx="1" />
        {ledOn && <rect x="31" y="20" width="4" height="2" fill="#a9f5c6" rx="1" opacity="0.9" />}
        {ledOn && <circle cx="33" cy="23" r="5" fill="#2ecc71" opacity="0.25" />}
        <text x="48" y="16.5" fill="#9fb3c8" fontSize="2" fontFamily="monospace" textAnchor="middle">PWR·PC13</text>

        {/* ===== Headers: gold-ring pads + drilled holes ===== */}
        {Array.from({ length: 20 }).map((_, i) => (
          <g key={`left-pin-${i}`}>
            <circle cx="15" cy={15 + i * 15} r="3.1" fill="url(#bp-gold)" stroke="#6b4e00" strokeWidth="0.4" />
            <circle cx="15" cy={15 + i * 15} r="1.2" fill="#0a0a0a" />
          </g>
        ))}
        {Array.from({ length: 20 }).map((_, i) => (
          <g key={`right-pin-${i}`}>
            <circle cx="75" cy={15 + i * 15} r="3.1" fill="url(#bp-gold)" stroke="#6b4e00" strokeWidth="0.4" />
            <circle cx="75" cy={15 + i * 15} r="1.2" fill="#0a0a0a" />
          </g>
        ))}
        {Array.from({ length: 4 }).map((_, i) => (
          <g key={`swd-pin-${i}`}>
            <circle cx={23.5 + i * 15} cy={315} r="3" fill="#d5d8dc" stroke="#5d6d7e" strokeWidth="0.4" />
            <circle cx={23.5 + i * 15} cy={315} r="1.2" fill="#0a0a0a" />
          </g>
        ))}
        <text x="46" y="310" fill="#9fb3c8" fontSize="2.6" fontFamily="monospace" textAnchor="middle">SWD 3V3 · DIO · CLK · GND</text>

        {/* ===== Silkscreen: title block + pin labels ===== */}
        <text x="46" y="170" fill="#ffffff" fontSize="4.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">GD32F103RB (128K)</text>
        <text x="46" y="176" fill="#9fb3c8" fontSize="3" fontFamily="monospace" textAnchor="middle">GD32RB · 128K/20K</text>
        <text x="46" y="181" fill="#9fb3c8" fontSize="2.6" fontFamily="monospace" textAnchor="middle">PA9/PA10 · PC13</text>

        <g fill="#ecf0f1" fontSize="4.5" fontFamily="monospace" fontWeight="bold">
          {LEFT_LABELS.map((label, i) => (
            <text key={`ll-${i}`} x="21" y={16 + i * 15}>{label}</text>
          ))}
        </g>
        <g fill="#ecf0f1" fontSize="4.5" fontFamily="monospace" fontWeight="bold" textAnchor="end">
          {RIGHT_LABELS.map((label, i) => (
            <text key={`rl-${i}`} x="69" y={16 + i * 15}>{label}</text>
          ))}
        </g>
      </svg>
    </div>
  );
};
