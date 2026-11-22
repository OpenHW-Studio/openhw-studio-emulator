import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 168, h: 140 };

const SW = 148;
const SH = 108;
const SX = 10;
const SY = 8;

export const LtdcDisplayUI = ({ state, attrs }: { state: any; attrs: any }) => {
  const W = Math.max(1, Number(state?.fbW ?? 0) || 0);
  const H = Math.max(1, Number(state?.fbH ?? 0) || 0);
  const fb: number[] = Array.isArray(state?.fb) ? state.fb : [];
  const hasFrame = W > 0 && H > 0 && fb.length >= W * H;
  const cw = SW / Math.max(1, W);
  const ch = SH / Math.max(1, H);
  const cells: React.ReactNode[] = [];
  if (hasFrame) {
    // Cap rendered cells for large frames (state keeps full res).
    const stepX = Math.max(1, Math.floor(W / 96));
    const stepY = Math.max(1, Math.floor(H / 64));
    for (let y = 0; y < H; y += stepY) {
      for (let x = 0; x < W; x += stepX) {
        const p = Number(fb[y * W + x] ?? 0) >>> 0;
        const r = (p >> 16) & 0xff;
        const g = (p >> 8) & 0xff;
        const b = p & 0xff;
        cells.push(
          <rect
            key={`px-${x}-${y}`}
            x={SX + x * cw}
            y={SY + y * ch}
            width={Math.max(0.6, cw * stepX)}
            height={Math.max(0.6, ch * stepY)}
            fill={`rgb(${r},${g},${b})`}
          />,
        );
      }
    }
  }

  return (
    <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h }}>
      <svg viewBox="0 0 168 140" width="100%" height="100%" style={{ display: 'block' }} xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="168" height="140" rx="6" fill="#1a1d24" stroke="#000" strokeWidth="1.2" />
        <rect x={SX - 2} y={SY - 2} width={SW + 4} height={SH + 4} rx="2" fill="#0a0c10" stroke="#3a4356" strokeWidth="1" />
        {!hasFrame && (
          <text x={SX + SW / 2} y={SY + SH / 2} fill="#5a6478" fontSize="6" fontFamily="monospace" textAnchor="middle">
            no frame
          </text>
        )}
        {cells}
        <text x="14" y="132" fill="#c8cfd6" fontSize="5" fontFamily="monospace">LTDC TFT</text>
        <circle cx="20" cy="130" r="1.6" fill="#c9a227" />
        <circle cx="148" cy="130" r="1.6" fill="#c9a227" />
        <text x="26" y="132" fill="#8a93a0" fontSize="4" fontFamily="monospace">VCC</text>
        <text x="138" y="132" fill="#8a93a0" fontSize="4" fontFamily="monospace" textAnchor="end">GND</text>
      </svg>
    </div>
  );
};
