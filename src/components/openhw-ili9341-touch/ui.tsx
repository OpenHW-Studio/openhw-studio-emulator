import React, { useEffect, useRef, useState } from 'react';

export const BOUNDS = { x: 0, y: 0, w: 240, h: 360 };

export const ILI9341TouchUI = ({ state, logic }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rgbaBufferRef = useRef(new Uint8ClampedArray(240 * 320 * 4));
    const lastHeartbeatRef = useRef(Date.now());

    useEffect(() => {
        const buf = rgbaBufferRef.current;
        for (let i = 3; i < buf.length; i += 4) {
            buf[i] = 255;
        }
    }, []);

    useEffect(() => {
        if (!state) return;

        if (state.t) {
            lastHeartbeatRef.current = Date.now();
        }

        const rgbaBuf = rgbaBufferRef.current;

        if (!state.powerOn || state.reset) {
            for (let i = 0; i < rgbaBuf.length; i += 4) {
                rgbaBuf[i] = 0; rgbaBuf[i + 1] = 0; rgbaBuf[i + 2] = 0; rgbaBuf[i + 3] = 255;
            }
            return;
        }

        const rgbBuf = state.buffer;
        if (rgbBuf && rgbBuf.length === 240 * 320 * 3) {
            for (let i = 0; i < 240 * 320; i++) {
                const src = i * 3;
                const dst = i * 4;
                rgbaBuf[dst] = rgbBuf[src];
                rgbaBuf[dst + 1] = rgbBuf[src + 1];
                rgbaBuf[dst + 2] = rgbBuf[src + 2];
            }
        }
    }, [state]);

    useEffect(() => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d', { alpha: false });
        if (!ctx) return;

        let animationId: number;

        const render = () => {
            const now = Date.now();
            const timeSinceHeartbeat = now - lastHeartbeatRef.current;

            if (timeSinceHeartbeat > 600) {
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, 240, 320);
            } else {
                const imgData = new ImageData(rgbaBufferRef.current, 240, 320);
                ctx.putImageData(imgData, 0, 0);
            }

            animationId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationId);
    }, []);

    // Handle touch interactions
    const handlePointerDown = (e: React.PointerEvent) => {
        if (!logic || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width * 240;
        const y = (e.clientY - rect.top) / rect.height * 320;
        if (logic.setTouchPoint) {
            logic.setTouchPoint(x, y, true);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!logic || !canvasRef.current) return;
        if (e.buttons > 0) {
            const rect = canvasRef.current.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width * 240;
            const y = (e.clientY - rect.top) / rect.height * 320;
            if (logic.setTouchPoint) {
                logic.setTouchPoint(x, y, true);
            }
        }
    };

    const handlePointerUp = () => {
        if (logic && logic.setTouchPoint) {
            logic.setTouchPoint(0, 0, false);
        }
    };

    const w = 240;
    const h = 360;

    return (
        <div style={{ width: w, height: h, position: 'relative' }}>
            <svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${w} ${h}`}
                xmlns="http://www.w3.org/2000/svg"
                style={{ display: 'block' }}
            >
                <g>
                    {/* PCB Background */}
                    <rect x="0" y="0" width={w} height={h} fill="#a01a1e" rx="6" />

                    {/* Mounting Holes */}
                    <circle cx="15" cy="15" r="6.75" fill="#FFFFFF" />
                    <circle cx={w - 15} cy="15" r="6.75" fill="#FFFFFF" />
                    <circle cx="15" cy={h - 15} r="6.75" fill="#FFFFFF" />
                    <circle cx={w - 15} cy={h - 15} r="6.75" fill="#FFFFFF" />

                    {/* Title Text */}
                    <text x={w / 2} y="33" fill="#FFFFFF" fontSize="21" fontFamily="monospace" textAnchor="middle" fontWeight="bold">ILI9341 Cap Touch</text>

                    {/* Screen Bezel */}
                    <rect x="7.5" y="43.5" width={w - 15} height={h - 63} fill="#F4E3EB" />

                    {/* Screen Dark Area */}
                    <rect x="12" y="48" width={w - 24} height={h - 72} fill="#000000" />

                    {/* The Simulation Canvas */}
                    <foreignObject x="12" y="48" width={w - 24} height={h - 72}>
                        <canvas
                            ref={canvasRef}
                            width={240}
                            height={320}
                            style={{
                                width: '100%',
                                height: '100%',
                                pointerEvents: 'none',
                                imageRendering: 'pixelated'
                            }}
                        />
                    </foreignObject>

                    {/* Touch Overlay */}
                    <rect 
                        x="12" y="48" width={w - 24} height={h - 72} 
                        fill="transparent"
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                    />

                    {/* Flex Cable Connector */}
                    <rect x={w / 2 - 60} y={h - 37.5} width="120" height="18" fill="#b06423" />

                    {/* "1" Text */}
                    <text x="31" y="357" fill="#FFFFFF" fontSize="16" fontFamily="sans-serif">1</text>

                    {/* Pin Headers at 15px pitch for 11 pins */}
                    <rect x="39" y="346.5" width="162" height="12" fill="none" stroke="#FFFFFF" strokeWidth="0.75" opacity="0.5" />
                    <rect x="42.75" y="350.25" width="4.5" height="4.5" fill="#FFFFFF" />
                    {[60, 75, 90, 105, 120, 135, 150, 165, 180, 195].map((x, i) => (
                        <circle key={i} cx={x} cy="352.5" r="2.25" fill="#FFFFFF" />
                    ))}
                </g>
            </svg>
        </div>
    );
};
