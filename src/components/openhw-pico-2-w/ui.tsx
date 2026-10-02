// @ts-nocheck
import React, { useState } from 'react';

export const BOUNDS = { x: 0, y: 0, w: 124, h: 314 };

export const Pico2WUI = ({ state, attrs, isRunning }: { state: any; attrs: any; isRunning?: boolean }) => {
  const [isResetPressed, setIsResetPressed] = useState(false);
  const txOn = !!state?.txActive;
  const rxOn = !!state?.rxActive;
  const ledOn = !!state?.builtInLed;
  const wirelessMode = String(attrs?.wirelessMode ?? 'full');
  const wifiStatus = String(state?.wirelessStatus ?? (wirelessMode === 'off' ? 'off' : 'stub'));
  const wifiActive = wirelessMode !== 'off' && wifiStatus !== 'off';

  const handleResetPress = (e: React.PointerEvent) => {
    if (!isRunning) return;
    e.stopPropagation();
    setIsResetPressed(true);
  };

  const handleResetRelease = () => {
    setIsResetPressed(false);
  };

  return (
    <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h, overflow: 'visible' }}>
      <svg viewBox="0 0 124 314" width="100%" height="100%" style={{ display: 'block' }} xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="122" height="312" rx="6" fill="#1e293b" stroke="#475569" />
        {[20.4,35.4,50.4,65.4,80.4,95.4,110.4,125.4,140.4,155.4,170.4,185.4,200.4,215.4,230.4,245.4,260.4,275.4,290.4,305.4].map((y, i) => (
          <circle key={'l'+i} cx="9.5" cy={y} r="2.5" fill="#f1c40f" stroke="#000" strokeWidth="0.5" />
        ))}
        {[20.4,35.4,50.4,65.4,80.4,95.4,110.4,125.4,140.4,155.4,170.4,185.4,200.4,215.4,230.4,245.4,260.4,275.4,290.4,305.4].map((y, i) => (
          <circle key={'r'+i} cx="114.5" cy={y} r="2.5" fill="#f88888" stroke="#000" strokeWidth="0.5" />
        ))}
        <text x="62" y="157" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="sans-serif">Pico 2 W</text>
        <circle cx="30" cy="33" r="2" fill={txOn ? '#ffb300' : '#555'} />
        <circle cx="36" cy="33" r="2" fill={rxOn ? '#ffb300' : '#555'} />
        <circle cx="62" cy="28" r="3" fill={ledOn ? '#38d600' : '#14401a'} />
        <circle cx="80" cy="28" r="3" fill={wifiActive ? '#38bdf8' : '#12394a'}>
          <title>{`wireless: ${wifiStatus}`}</title>
        </circle>
        <g onPointerDown={handleResetPress} onPointerUp={handleResetRelease} onPointerLeave={handleResetRelease}
          onClick={(e) => { if (!isRunning) return; e.stopPropagation(); attrs.onInteract?.('RESET'); }}
          style={{ cursor: isRunning ? 'pointer' : 'default' }}>
          <circle cx="62" cy="290" r="5.5" fill={isResetPressed ? '#cfd3d8' : '#eceff3'} stroke="#30343b" />
          <text x="62" y="302" textAnchor="middle" fill="#8892a0" fontSize="6" fontFamily="monospace">RESET</text>
        </g>
      </svg>
    </div>
  );
};

export const contextMenuDuringRun = true;
