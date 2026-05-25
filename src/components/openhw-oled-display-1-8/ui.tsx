import React, { useEffect, useRef } from 'react';

// Bounding box for the selection ring
export const BOUNDS = { x: 0, y: 0, w: 135, h: 120 };

export const OLEDDisplayUI = ({ state }: { state: any }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const imageDataRef = useRef<ImageData | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Pre-allocate ImageData to avoid GC pressure
    imageDataRef.current = ctx.createImageData(128, 64);
    const imgData = imageDataRef.current;

    // Fill with background color initially
    for (let i = 0; i < imgData.data.length; i += 4) {
      imgData.data[i] = 34;
      imgData.data[i + 1] = 34;
      imgData.data[i + 2] = 34;
      imgData.data[i + 3] = 255;
    }

    let animationId: number;

    const render = () => {
      const currentState = stateRef.current;
      if (currentState && currentState.vram && currentState.displayOn) {
        const { vram, invert, allOn, displayStartLine, segmentRemap, comScanDir, displayOffset } = currentState;

        for (let page = 0; page < 8; page++) {
          for (let col = 0; col < 128; col++) {
            const vramIndex = (page * 128) + col;
            const byte = vram[vramIndex];

            for (let bit = 0; bit < 8; bit++) {
              let isOn = (byte >> bit) & 1;
              if (allOn) isOn = 1;
              if (invert) isOn = isOn ? 0 : 1;

              // Physical coordinate mapping: Standard modules are 180-rotated by default
              let x = segmentRemap ? col : (127 - col);
              let y = (page * 8) + bit;

              // Apply Display Start Line and Offset
              y = (y - displayStartLine + 64) % 64;

              // COM Scan Direction: Invert logic so library 'Correction' (C8) is upright
              if (!comScanDir) y = 63 - y;

              // Apply Display Offset (Vertical Shift)
              y = (y + displayOffset) % 64;

              const pixelIndex = (y * 128 + x) * 4;

              const r = isOn ? 200 : 34;
              const g = isOn ? 243 : 34;
              const b = isOn ? 255 : 34;

              imgData.data[pixelIndex] = r;
              imgData.data[pixelIndex + 1] = g;
              imgData.data[pixelIndex + 2] = b;
            }
          }
        }
        ctx.putImageData(imgData, 0, 0);
      } else if (currentState && !currentState.displayOn) {
        // Clear screen if display is OFF
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, 128, 64);
      }
      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, []);

  const nativeW = 135;
  const nativeH = 120;

  return (
    <div style={{
        width: BOUNDS.w,
        height: BOUNDS.h,
        pointerEvents: 'none',
        position: 'relative'
    }}>
        <svg 
            width={nativeW} 
            height={nativeH} 
            viewBox={`0 0 ${nativeW} ${nativeH}`} 
            xmlns="http://www.w3.org/2000/svg"
            style={{ 
                display: 'block'
            }}
        >
        <rect width={nativeW} height={nativeH} fill="#104271" rx="4" />

        {/* Mounting holes */}
        <circle cx="10" cy="10" r="5" fill="#FFFFFF" />
        <circle cx={nativeW - 10} cy="10" r="5" fill="#FFFFFF" />
        <circle cx="10" cy={nativeH - 10} r="5" fill="#FFFFFF" />
        <circle cx={nativeW - 10} cy={nativeH - 10} r="5" fill="#FFFFFF" />

        {/* I2C Header Plastic */}
        <rect x="25" y="4" width="66" height="16" fill="#222" rx="2" />

        {/* Pins at 30, 45, 60, 75 (15px pitch) */}
        <circle cx="30" cy="7.5" r="3.5" stroke="#E5B85C" strokeWidth="2" fill="#FFFFFF" />
        <circle cx="45" cy="7.5" r="3.5" stroke="#E5B85C" strokeWidth="2" fill="#FFFFFF" />
        <circle cx="60" cy="7.5" r="3.5" stroke="#E5B85C" strokeWidth="2" fill="#FFFFFF" />
        <circle cx="75" cy="7.5" r="3.5" stroke="#E5B85C" strokeWidth="2" fill="#FFFFFF" />

        <text x="30" y="26" fill="#FFFFFF" fontSize="5" fontFamily="Arial, sans-serif" fontWeight="bold" textAnchor="middle">GND</text>
        <text x="45" y="26" fill="#FFFFFF" fontSize="5" fontFamily="Arial, sans-serif" fontWeight="bold" textAnchor="middle">VCC</text>
        <text x="60" y="26" fill="#FFFFFF" fontSize="5" fontFamily="Arial, sans-serif" fontWeight="bold" textAnchor="middle">SCL</text>
        <text x="75" y="26" fill="#FFFFFF" fontSize="5" fontFamily="Arial, sans-serif" fontWeight="bold" textAnchor="middle">SDA</text>

        {/* Screen area */}
        <rect x="8" y="30" width="107.5" height="65" fill="#050505" rx="2" />
        <rect x="9" y="31" width="105.5" height="63" fill="#111" rx="1" />

        <foreignObject x="9" y="31" width="105.5" height="63">
            <canvas
            ref={canvasRef}
            width="128"
            height="64"
            style={{ width: '100%', height: '100%', imageRendering: 'pixelated', pointerEvents: 'none' }}
            />
        </foreignObject>

        <text x={nativeW / 2} y={nativeH - 12} fill="#FFFFFF" fontSize="7" textAnchor="middle" opacity="0.5">SSD1306 OLED</text>
        </svg>
    </div>
  );
};
