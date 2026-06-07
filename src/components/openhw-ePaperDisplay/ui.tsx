import React, { useEffect, useRef } from 'react';

export const BOUNDS = { x: 0, y: 0, w: 220, h: 135 };

export const EPaperUI = ({ state }: { state: any }) => {
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

    imageDataRef.current = ctx.createImageData(296, 128);
    const imgData = imageDataRef.current;

    for (let i = 0; i < imgData.data.length; i += 4) {
      imgData.data[i] = 255;
      imgData.data[i + 1] = 255;
      imgData.data[i + 2] = 255;
      imgData.data[i + 3] = 255;
    }
    
    let animationId: number;

    const render = () => {
      const currentState = stateRef.current;
      if (currentState && currentState.vram && currentState.powerOn) {
        const { vram } = currentState;
        for (let i = 0; i < 296 * 128; i++) {
          const byteIndex = Math.floor(i / 8);
          // Standard e-paper packing: MSB first
          const bitIndex = 7 - (i % 8);
          const isOn = (vram[byteIndex] >> bitIndex) & 1;
          
          // 1 = white, 0 = black
          const r = isOn ? 255 : 0;
          const g = isOn ? 255 : 0;
          const b = isOn ? 255 : 0;

          const pixelIndex = i * 4;
          imgData.data[pixelIndex] = r;
          imgData.data[pixelIndex + 1] = g;
          imgData.data[pixelIndex + 2] = b;
        }
        ctx.putImageData(imgData, 0, 0);
      }
      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, []);

  const nativeW = BOUNDS.w;
  const nativeH = BOUNDS.h;

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
            style={{ display: 'block' }}
        >
        {/* PCB */}
        <rect width={nativeW} height={nativeH} fill="#2A4B7C" rx="5" />
        
        {/* Mounting holes */}
        <circle cx="10" cy="10" r="4" fill="#FFFFFF" />
        <circle cx="10" cy={nativeH - 10} r="4" fill="#FFFFFF" />
        <circle cx={nativeW - 10} cy="10" r="4" fill="#FFFFFF" />
        <circle cx={nativeW - 10} cy={nativeH - 10} r="4" fill="#FFFFFF" />

        {/* Pin Labels & Pins */}
        {[
            { id: "VCC", y: 15 },
            { id: "GND", y: 30 },
            { id: "DIN", y: 45 },
            { id: "CLK", y: 60 },
            { id: "CS",  y: 75 },
            { id: "DC",  y: 90 },
            { id: "RST", y: 105 },
            { id: "BUSY",y: 120 }
        ].map(pin => (
            <g key={pin.id}>
                <circle cx="15" cy={pin.y} r="2.5" stroke="#E5B85C" strokeWidth="1" fill="#FFFFFF" />
                <text x="21" y={pin.y + 1.5} fill="#FFFFFF" fontSize="4" fontFamily="Arial, sans-serif" fontWeight="bold">{pin.id}</text>
            </g>
        ))}

        {/* Screen bezel (centered vertically) */}
        <rect x="40" y="27.5" width="160" height="80" fill="#E0E0E0" rx="2" />
        <rect x="43" y="30.5" width="154" height="74" fill="#000000" />
        
        <foreignObject x="45" y="32.5" width="150" height="70">
            <canvas
            ref={canvasRef}
            width="296"
            height="128"
            style={{ width: '100%', height: '100%', imageRendering: 'pixelated', pointerEvents: 'none', backgroundColor: '#FFFFFF' }}
            />
        </foreignObject>

        {/* Right side text */}
        <text 
            x={nativeW - 15} 
            y={nativeH / 2} 
            fill="#FFFFFF" 
            fontSize="6" 
            fontFamily="Arial, sans-serif" 
            fontWeight="bold" 
            transform={`rotate(-90 ${nativeW - 15} ${nativeH / 2})`}
            textAnchor="middle"
        >
            2.9inch e-Paper Module
        </text>
        </svg>
    </div>
  );
};
