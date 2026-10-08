import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 160, h: 190 };

// 5x5 LED matrix geometry (matches the .svg twin)
const MX = 62;
const MY = 50;
const MP = 9.5;
const MR = 3.4;

// Edge-finger geometry (matches manifest pin coordinates)
const LARGE = [
  { id: 'P0', x: 24 }, { id: 'P1', x: 42 }, { id: 'P2', x: 60 },
  { id: '3V3', x: 78 }, { id: 'GND', x: 96 },
];
const SMALL_IDS = [
  'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10',
  'P11', 'P12', 'P13', 'P14', 'P15', 'P16', 'P19', 'P20',
];
const smallX = (i: number) => 104 + i * 3.1;

export const MicrobitV2UI = ({ state, attrs }: { state: any; attrs: any }) => {
  // Runner publishes matrixLit = COUNT of lit LEDs (0-25); light the
  // first N in row-major order (the firmware scans the same way).
  const lit = Math.max(0, Math.min(25, Number(state?.matrixLit ?? 0) || 0));
  const leds: React.ReactNode[] = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const on = r * 5 + c < lit;
      leds.push(
        <circle
          key={`mb-led-${r}-${c}`}
          cx={MX + c * MP}
          cy={MY + r * MP}
          r={MR}
          fill={on ? '#ff2e2e' : '#4d1010'}
          stroke={on ? '#ffb3b3' : '#2a0808'}
          strokeWidth="0.5"
          opacity={on ? 1 : 0.9}
        />,
      );
      if (on) {
        leds.push(
          <circle
            key={`mb-glow-${r}-${c}`}
            cx={MX + c * MP}
            cy={MY + r * MP}
            r={MR + 1.6}
            fill="#ff2e2e"
            opacity="0.25"
          />,
        );
      }
    }
  }

  return (
    <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h }}>
      <svg
        viewBox="0 0 160 190"
        width="100%"
        height="100%"
        style={{ display: 'block' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="mb-mask" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="4" fill="#151821" />
            <circle cx="1.2" cy="1.2" r="0.4" fill="#1b2029" />
          </pattern>
          <linearGradient id="mb-usb" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dfe6ec" />
            <stop offset="0.5" stopColor="#a7b2bb" />
            <stop offset="1" stopColor="#c6ced4" />
          </linearGradient>
          <radialGradient id="mb-gold" cx="0.4" cy="0.35" r="1">
            <stop offset="0" stopColor="#ffe9a3" />
            <stop offset="0.55" stopColor="#e3b808" />
            <stop offset="1" stopColor="#8a6d03" />
          </radialGradient>
          <linearGradient id="mb-chip" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3b5068" />
            <stop offset="0.5" stopColor="#2c3e50" />
            <stop offset="1" stopColor="#1a2530" />
          </linearGradient>
        </defs>

        {/* ===== PCB base ===== */}
        <rect x="8" y="8" width="144" height="174" rx="9" fill="#101319" stroke="#000" strokeWidth="1.2" />
        <rect x="8" y="8" width="144" height="174" rx="9" fill="url(#mb-mask)" opacity="0.6" />
        <rect x="10" y="10" width="140" height="170" rx="7" fill="none" stroke="#2a3140" strokeWidth="0.6" opacity="0.8" />

        {/* ===== micro-USB (top center, straddles edge) ===== */}
        <rect x="66" y="1" width="28" height="16" rx="2" fill="url(#mb-usb)" stroke="#5d6d7e" strokeWidth="0.8" />
        <rect x="66" y="1" width="28" height="4" fill="#eef1f4" opacity="0.5" />
        <rect x="70" y="6" width="20" height="8" rx="1" fill="#1a252f" />
        <text x="80" y="26" fill="#c8cfd6" fontSize="4.5" fontFamily="monospace" textAnchor="middle">USB</text>

        {/* ===== JST battery (top left) + power LED ===== */}
        <rect x="18" y="2" width="17" height="10" rx="1" fill="#e8e8e8" stroke="#5d6d7e" strokeWidth="0.7" />
        <rect x="21" y="4.5" width="11" height="5" fill="#c0392b" rx="0.5" />
        <text x="26.5" y="21" fill="#c8cfd6" fontSize="4" fontFamily="monospace" textAnchor="middle">BAT</text>
        <circle cx="46" cy="7" r="2" fill="#27ae60" />
        <circle cx="46" cy="7" r="3.2" fill="none" stroke="#27ae60" strokeWidth="0.5" opacity="0.6" />
        <text x="46" y="21" fill="#c8cfd6" fontSize="4" fontFamily="monospace" textAnchor="middle">PWR</text>

        {/* ===== silk: name + version ===== */}
        <text x="80" y="38" fill="#e8e8e8" fontSize="7" fontFamily="monospace" textAnchor="middle" fontWeight="bold">micro:bit</text>
        <text x="128" y="38" fill="#e8e8e8" fontSize="5" fontFamily="monospace" textAnchor="middle">V2</text>

        {/* ===== 5x5 LED matrix well ===== */}
        <rect x="54" y="42" width="54" height="54" rx="3" fill="#2a0d0d" stroke="#571414" strokeWidth="0.8" />
        {leds}

        {/* ===== buttons A / B ===== */}
        <g>
          <ellipse cx="28" cy="122" rx="8" ry="1.8" fill="#000" opacity="0.4" />
          <rect x="20" y="108" width="16" height="12" rx="2" fill="#8a939c" stroke="#5d6d7e" strokeWidth="0.8" />
          <rect x="22" y="110" width="12" height="8" rx="1" fill="#232a33" />
          <circle cx="28" cy="114" r="2.6" fill="#dfe3e8" stroke="#2c3e50" strokeWidth="0.6" />
          <text x="28" y="128" fill="#e8e8e8" fontSize="6" fontFamily="monospace" textAnchor="middle" fontWeight="bold">A</text>
        </g>
        <g>
          <ellipse cx="132" cy="122" rx="8" ry="1.8" fill="#000" opacity="0.4" />
          <rect x="124" y="108" width="16" height="12" rx="2" fill="#8a939c" stroke="#5d6d7e" strokeWidth="0.8" />
          <rect x="126" y="110" width="12" height="8" rx="1" fill="#232a33" />
          <circle cx="132" cy="114" r="2.6" fill="#dfe3e8" stroke="#2c3e50" strokeWidth="0.6" />
          <text x="132" y="128" fill="#e8e8e8" fontSize="6" fontFamily="monospace" textAnchor="middle" fontWeight="bold">B</text>
        </g>

        {/* ===== nRF52833 + motion chip ===== */}
        <g>
          <rect x="58" y="104" width="18" height="18" fill="url(#mb-chip)" stroke="#0a0e13" strokeWidth="0.7" />
          <circle cx="62" cy="108" r="1" fill="#10161d" />
          <text x="67" y="115" fill="#9fb3c8" fontSize="3.4" fontFamily="monospace" textAnchor="middle">nRF</text>
        </g>
        <g>
          <rect x="86" y="106" width="14" height="14" fill="url(#mb-chip)" stroke="#0a0e13" strokeWidth="0.7" />
          <text x="93" y="114.5" fill="#9fb3c8" fontSize="3" fontFamily="monospace" textAnchor="middle">MOT</text>
        </g>

        {/* ===== mic holes ===== */}
        <g fill="#000">
          <circle cx="118" cy="146" r="1.1" /><circle cx="121.5" cy="146" r="1.1" /><circle cx="125" cy="146" r="1.1" />
          <circle cx="118" cy="149.5" r="1.1" /><circle cx="121.5" cy="149.5" r="1.1" /><circle cx="125" cy="149.5" r="1.1" />
        </g>
        <text x="121.5" y="157" fill="#c8cfd6" fontSize="3.6" fontFamily="monospace" textAnchor="middle">MIC</text>

        {/* ===== speaker rings ===== */}
        <g fill="none" stroke="#3a4356" strokeWidth="0.7">
          <circle cx="38" cy="148" r="4" /><circle cx="38" cy="148" r="7" /><circle cx="38" cy="148" r="10" />
        </g>
        <circle cx="38" cy="148" r="1.6" fill="#3a4356" />
        <text x="38" y="164" fill="#c8cfd6" fontSize="3.6" fontFamily="monospace" textAnchor="middle">SPK</text>

        {/* ===== reset tap ===== */}
        <circle cx="80" cy="150" r="2.2" fill="#c9a227" stroke="#7a6210" strokeWidth="0.6" />
        <circle cx="80" cy="150" r="0.9" fill="#000" />
        <text x="80" y="160" fill="#c8cfd6" fontSize="3.4" fontFamily="monospace" textAnchor="middle">RESET</text>

        {/* ===== edge connector: 5 large + 16 small gold fingers ===== */}
        {LARGE.map((p) => (
          <g key={`mb-f-${p.id}`}>
            <rect x={p.x - 6.5} y={164} width={13} height={18} fill="url(#mb-gold)" stroke="#6b5203" strokeWidth="0.6" />
            <text x={p.x} y={162} fill="#e8e8e8" fontSize="4.4" fontFamily="monospace" textAnchor="middle" fontWeight="bold">{p.id}</text>
          </g>
        ))}
        {SMALL_IDS.map((id, i) => (
          <g key={`mb-s-${id}`}>
            <rect x={smallX(i) - 1.2} y={166} width={2.4} height={16} fill="url(#mb-gold)" stroke="#6b5203" strokeWidth="0.4" />
            <text
              x={smallX(i)}
              y={i % 2 === 0 ? 160 : 163.4}
              fill="#c8cfd6"
              fontSize="2.6"
              fontFamily="monospace"
              textAnchor="middle"
            >
              {id}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};
