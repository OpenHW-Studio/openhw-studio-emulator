import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 168, h: 120 };

const STATE_COLOR: Record<string, string> = {
  detached: '#5a6478',
  init: '#c9a227',
  reset: '#c9a227',
  enumerated: '#3fd08c',
};

export const UsbDeviceUI = ({ state, attrs }: { state: any; attrs: any }) => {
  const st = String(state?.enumState ?? 'detached');
  const rx = Number(state?.rxCount ?? 0);
  const echo = String(state?.lastEcho ?? '');
  const color = STATE_COLOR[st] ?? '#5a6478';

  return (
    <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h }}>
      <svg viewBox="0 0 168 120" width="100%" height="100%" style={{ display: 'block' }} xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="168" height="120" rx="6" fill="#1a1d24" stroke="#000" strokeWidth="1.2" />
        <rect x="8" y="6" width="152" height="78" rx="2" fill="#0a0c10" stroke="#3a4356" strokeWidth="1" />
        <circle cx="20" cy="20" r="4" fill={color} />
        <text x="30" y="22" fill="#c8cfd6" fontSize="6" fontFamily="monospace">{st}</text>
        <text x="14" y="40" fill="#8a93a0" fontSize="5" fontFamily="monospace">rx bytes: {rx}</text>
        <text x="14" y="52" fill="#8a93a0" fontSize="5" fontFamily="monospace">echo: {echo.slice(0, 20) || '-'}</text>
        <text x="14" y="112" fill="#c8cfd6" fontSize="5" fontFamily="monospace">USB DEVICE</text>
        <circle cx="20" cy="110" r="1.6" fill="#c9a227" />
        <circle cx="148" cy="110" r="1.6" fill="#c9a227" />
        <text x="26" y="112" fill="#8a93a0" fontSize="4" fontFamily="monospace">VCC</text>
        <text x="138" y="112" fill="#8a93a0" fontSize="4" fontFamily="monospace" textAnchor="end">GND</text>
      </svg>
    </div>
  );
};
