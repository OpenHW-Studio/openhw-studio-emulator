import React from 'react';
import SVG from './esp32p4.svg';

export const BOUNDS = { x: 0, y: 0, w: 164.0625, h: 312.5 };

export const Esp32P4UI = ({ id, attrs, isRunning }: { id: string, attrs: any, isRunning?: boolean }) => {
  return (
    <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h }}>
      <img src={SVG} style={{ width: '100%', height: '100%', pointerEvents: 'none' }} alt="ESP32-P4" />
      <div style={{
        position: 'absolute',
        top: 312.5,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: 10,
        fontWeight: 'bold',
        color: 'var(--text3)',
        opacity: 0.15,
        pointerEvents: 'none',
        fontFamily: 'sans-serif'
      }}>
        OPENHW STUDIO
      </div>
    </div>
  );
};
