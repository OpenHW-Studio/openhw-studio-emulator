import React from 'react';

// Bounding box for the selection ring and hit detection area.
// These should match the visual size of the component on the canvas.
export const BOUNDS = { x: 0, y: 0, w: 164.0625, h: 312.5 };

export const Esp32UI = ({ id, attrs, isRunning }: { id: string, attrs: any, isRunning?: boolean }) => {
  const nativeW = 87.5;
  const nativeH = 166.6666;

  // Custom scale and offsets to align perfectly with manifest pins
  const scale = 1.6;
  const translateX = -3;
  const translateY = -4;

  return (
    <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h }}>
      {/* 
        Official Wokwi ESP32 DevKit V1 Web Component.
        We apply display block, set the native dimensions, and scale to fit the bounds.
      */}
      {React.createElement('wokwi-esp32-devkit-v1', {
        style: {
          display: 'block',
          width: nativeW,
          height: nativeH,
          transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
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
