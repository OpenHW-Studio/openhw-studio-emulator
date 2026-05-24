import React from 'react';

// Bounding box for the selection ring and hit detection area.
// These should match the visual size of the component on the canvas.
export const BOUNDS = { x: 0, y: 0, w: 105, h: 200 };

export const Esp32UI = ({ id, attrs, isRunning }: { id: string, attrs: any, isRunning?: boolean }) => {
  return (
    <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h }}>
      {/* 
        Official Wokwi ESP32 DevKit V1 Web Component.
        We scale it to fit our desired bounds (4.5x original mm size).
      */}
      {React.createElement('wokwi-esp32-devkit-v1', {
        style: { 
          transform: 'scale(1.2)', 
          transformOrigin: '0 0',
          pointerEvents: 'none' 
        },
        ...attrs
      })}

      {/* 
        Standardized Silkscreen branding (as a subtle overlay so we don't interfere 
        with the web component's internal graphics)
      */}
      <div style={{
        position: 'absolute',
        top: 200,
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
