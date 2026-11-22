import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 140, h: 320 };

// Manifest order: LEFT 20 rows (x=15, y=15+i*15), RIGHT 17 rows (x=125, y=15+i*15, rows 0..16), SWD bottom.
const LEFT_LABELS = [
  '5V', 'GND', '3V3', 'PA0', 'PA1', 'PA2', 'PA3', 'PA4', 'PA5', 'PA6',
  'PA7', 'PB0', 'PB1', 'PB6', 'PB7', 'PB8', 'PB9', 'RST', 'GND', '3V3',
];
const RIGHT_LABELS = [
  'GND', 'PC0', 'PC1', 'PD12', 'PD13', 'PD14', 'PD15', 'PC6', 'PC7', 'PA9',
  'PA10', 'PA11', 'PA12', 'PB12', 'PB13', 'PB14', 'PB15',
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
        <defs>
          {/* Discovery dark soldermask texture */}
          <pattern id="f4-mask" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="4" fill="#1a1a2e" />
            <circle cx="1" cy="1" r="0.45" fill="#22223a" />
            <circle cx="3" cy="3" r="0.3" fill="#16162a" />
          </pattern>
          {/* TFT glass */}
          <linearGradient id="f4-tft" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1b4f7a" />
            <stop offset="0.5" stopColor="#12395b" />
            <stop offset="1" stopColor="#0b2440" />
          </linearGradient>
          {/* MCU bevel */}
          <linearGradient id="f4-mcu" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3b5068" />
            <stop offset="0.5" stopColor="#2c3e50" />
            <stop offset="1" stopColor="#1d2a38" />
          </linearGradient>
          {/* Gold header sheen */}
          <radialGradient id="f4-gold" cx="0.35" cy="0.3" r="1">
            <stop offset="0" stopColor="#ffe9a3" />
            <stop offset="0.55" stopColor="#f1c40f" />
            <stop offset="1" stopColor="#9a7603" />
          </radialGradient>
        </defs>

        {/* ===== PCB base: near-black Discovery + texture + edge rail ===== */}
        <rect x="0" y="5" width="140" height="305" rx="4" fill="#1a1a2e" stroke="#0d0d1a" strokeWidth="1" />
        <rect x="0" y="5" width="140" height="305" rx="4" fill="url(#f4-mask)" opacity="0.6" />
        <rect x="1.5" y="6.5" width="137" height="302" rx="3" fill="none" stroke="#34345a" strokeWidth="0.5" opacity="0.8" />

        {/* ===== ST-LINK/V2 top module: shell + mini-USB + status LEDs ===== */}
        <rect x="30" y="0" width="80" height="14" fill="#95a5a6" rx="2" stroke="#5d6d7e" strokeWidth="0.7" />
        <rect x="30" y="0" width="80" height="4" fill="#d5d8dc" rx="2" opacity="0.5" />
        <rect x="86" y="3" width="16" height="8" fill="#1a252f" rx="1" />
        <rect x="88" y="5" width="12" height="4" fill="#ecf0f1" rx="0.5" />
        <circle cx="36" cy="7" r="1.6" fill="#e74c3c" />
        <circle cx="36" cy="11" r="1.6" fill="#2ecc71" />
        <text x="52" y="11.5" fill="#2c3e50" fontSize="5" fontFamily="monospace" textAnchor="middle">ST-LINK/V2</text>

        {/* ===== STM32F401CCU6 LQFP144: body + dense pins + pin-1 dot ===== */}
        <g transform="translate(70, 108)">
          <rect x="-24" y="-24" width="48" height="48" fill="#000" opacity="0.35" rx="3" />
          <rect x="-22" y="-22" width="44" height="44" fill="url(#f4-mcu)" rx="2" stroke="#10161d" strokeWidth="0.7" />
          {Array.from({ length: 16 }).map((_, i) => (
            <React.Fragment key={`mcu-pin-${i}`}>
              <line x1="-23" y1={-19 + i * 2.5} x2="-27" y2={-19 + i * 2.5} stroke="#d5d8dc" strokeWidth="0.7" />
              <line x1="23" y1={-19 + i * 2.5} x2="27" y2={-19 + i * 2.5} stroke="#d5d8dc" strokeWidth="0.7" />
              <line x1={-19 + i * 2.5} y1="-23" x2={-19 + i * 2.5} y2="-27" stroke="#d5d8dc" strokeWidth="0.7" />
              <line x1={-19 + i * 2.5} y1="23" x2={-19 + i * 2.5} y2="27" stroke="#d5d8dc" strokeWidth="0.7" />
            </React.Fragment>
          ))}
          <text x="0" y="-5" fill="#aeb6bf" fontSize="5" fontFamily="monospace" textAnchor="middle">STM32</text>
          <text x="0" y="2" fill="#aeb6bf" fontSize="4" fontFamily="monospace" textAnchor="middle">F401CCU6</text>
          <text x="0" y="8" fill="#7f8c8d" fontSize="2.6" fontFamily="monospace" textAnchor="middle">QFN48 · 84MHz</text>
          <circle cx="-16" cy="-16" r="2" fill="#10161d" stroke="#5d6d7e" strokeWidth="0.4" />
        </g>

        {/* ===== USB-C device port + NRST + 25MHz can (BlackPill) ===== */}
        <rect x="32" y="140" width="38" height="12" fill="#aeb9c2" rx="3" stroke="#5d6d7e" strokeWidth="0.7" />
        <rect x="34" y="142" width="34" height="8" fill="#1a252f" rx="1.5" />
        <rect x="36" y="144" width="30" height="4" fill="#ecf0f1" rx="1" />
        <text x="51" y="158" fill="#7f8c8d" fontSize="3.2" fontFamily="monospace" textAnchor="middle">USB-C</text>
        <text x="51" y="162" fill="#5d6d7e" fontSize="2.4" fontFamily="monospace" textAnchor="middle">DEVICE · FS PHY</text>

        {/* ===== NRST tactile + 25MHz + 32kHz cans (BlackPill) ===== */}
        <rect x="74" y="142" width="20" height="10" fill="#8a939c" rx="2" stroke="#5d6d7e" strokeWidth="0.6" />
        <circle cx="84" cy="147" r="3" fill="#0a0a0a" stroke="#2c3e50" strokeWidth="0.5" />
        <text x="84" y="158" fill="#5d6d7e" fontSize="2.4" fontFamily="monospace" textAnchor="middle">NRST</text>
        <rect x="74" y="160" width="20" height="7" fill="#c7ced5" rx="3.5" stroke="#7f8c8d" strokeWidth="0.6" />
        <text x="84" y="165.5" fill="#2c3e50" fontSize="2.8" fontFamily="monospace" textAnchor="middle">25.0</text>

        {/* ===== Single status LED + BOOT0 jumper (BlackPill) ===== */}
        <rect x="96" y="176" width="20" height="10" fill="#14181d" rx="1" stroke="#000" strokeWidth="0.5" />
        <rect x="98" y="178" width="6" height="6" fill="#f1c40f" stroke="#9a7603" strokeWidth="0.4" />
        <rect x="106" y="178" width="6" height="6" fill="#f1c40f" stroke="#9a7603" strokeWidth="0.4" />
        <text x="106" y="192" fill="#5d6d7e" fontSize="2.4" fontFamily="monospace" textAnchor="middle">BOOT0</text>

        {/* ===== User LEDs: LD3 green PG13 (dynamic) + LD4 red PD14-ish companion ===== */}
        <rect x="96" y="198" width="7" height="9" fill="#0e3a22" rx="1" />
        <circle cx="99.5" cy="202.5" r="2.6" fill={ledOn ? '#2ecc71' : '#145a32'} />
        {ledOn && <circle cx="99.5" cy="202.5" r="5" fill="#2ecc71" opacity="0.25" />}
        <rect x="105" y="198" width="7" height="9" fill="#3a0e0e" rx="1" />
        <circle cx="108.5" cy="202.5" r="2.6" fill="#7b1f1f" />
        <text x="104" y="220" fill="#9fb3c8" fontSize="3" fontFamily="monospace" textAnchor="middle">PC13 · BUILT-IN LED</text>

        {/* ===== USER (PA0 blue) + RESET (black) pushbuttons ===== */}
        <ellipse cx="64" cy="242" rx="13" ry="1.8" fill="#000" opacity="0.35" />
        <rect x="52" y="230" width="24" height="10" fill="#8a939c" rx="2" stroke="#5d6d7e" strokeWidth="0.6" />
        <rect x="54" y="232" width="20" height="6" fill="#232a33" rx="1.2" />
        <circle cx="64" cy="235" r="3" fill="#2980b9" stroke="#1a5276" strokeWidth="0.6" />
        <text x="64" y="248" fill="#9fb3c8" fontSize="3" fontFamily="monospace" textAnchor="middle">USER PA0</text>
        <rect x="80" y="230" width="14" height="10" fill="#8a939c" rx="2" stroke="#5d6d7e" strokeWidth="0.6" />
        <rect x="82" y="232" width="10" height="6" fill="#232a33" rx="1.2" />
        <circle cx="87" cy="235" r="2.4" fill="#0a0a0a" stroke="#2c3e50" strokeWidth="0.5" />
        <text x="87" y="248" fill="#9fb3c8" fontSize="3" fontFamily="monospace" textAnchor="middle">RESET</text>

        {/* ===== 8MHz crystal can ===== */}
        <rect x="52" y="253" width="5" height="3" fill="#c9a227" />
        <rect x="71" y="253" width="5" height="3" fill="#c9a227" />
        <rect x="54" y="253" width="24" height="8" fill="#c7ced5" rx="4" stroke="#7f8c8d" strokeWidth="0.7" />
        <rect x="54" y="253" width="24" height="3.5" fill="#eef1f4" rx="1.7" opacity="0.8" />
        <text x="66" y="259" fill="#2c3e50" fontSize="3.6" fontFamily="monospace" textAnchor="middle">8.000</text>

        {/* ===== Board silkscreen title ===== */}
        <text x="70" y="276" fill="#ffffff" fontSize="4.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">F401 BlackPill</text>
        <text x="70" y="282" fill="#9fb3c8" fontSize="3" fontFamily="monospace" textAnchor="middle">F401CC · 84MHz · 512K/96K</text>
        <text x="70" y="287" fill="#9fb3c8" fontSize="2.6" fontFamily="monospace" textAnchor="middle">USART1 PA9/PA10 · USB-C · PC13 LED</text>

        {/* ===== Headers: gold-ring pads + drilled holes ===== */}
        {Array.from({ length: 20 }).map((_, i) => (
          <g key={`left-pin-${i}`}>
            <circle cx="15" cy={15 + i * 15} r="3.1" fill="url(#f4-gold)" stroke="#6b4e00" strokeWidth="0.4" />
            <circle cx="15" cy={15 + i * 15} r="1.2" fill="#0a0a0a" />
          </g>
        ))}
        {Array.from({ length: 17 }).map((_, i) => (
          <g key={`right-pin-${i}`}>
            <circle cx="125" cy={15 + i * 15} r="3.1" fill="url(#f4-gold)" stroke="#6b4e00" strokeWidth="0.4" />
            <circle cx="125" cy={15 + i * 15} r="1.2" fill="#0a0a0a" />
          </g>
        ))}
        {Array.from({ length: 3 }).map((_, i) => (
          <g key={`swd-pin-${i}`}>
            <circle cx={45 + i * 20} cy={312} r="3" fill="#d5d8dc" stroke="#5d6d7e" strokeWidth="0.4" />
            <circle cx={45 + i * 20} cy={312} r="1.2" fill="#0a0a0a" />
          </g>
        ))}
        <text x="65" y="306" fill="#9fb3c8" fontSize="2.6" fontFamily="monospace" textAnchor="middle">SWD DIO · CLK · GND</text>

        {/* ===== Pin silkscreen ===== */}
        <g fill="#ecf0f1" fontSize="4.5" fontFamily="monospace" fontWeight="bold">
          {LEFT_LABELS.map((label, i) => (
            <text key={`ll-${i}`} x="21" y={16 + i * 15}>{label}</text>
          ))}
        </g>
        <g fill="#ecf0f1" fontSize="4.5" fontFamily="monospace" fontWeight="bold" textAnchor="end">
          {RIGHT_LABELS.map((label, i) => (
            <text key={`rl-${i}`} x="119" y={16 + i * 15}>{label}</text>
          ))}
        </g>
      </svg>
    </div>
  );
};
