import React, { useEffect, useRef } from 'react';

export const BOUNDS = { x: 0, y: 0, w: 240, h: 360 };

export const ILI9341UI = ({ state }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // Shadow buffer Ref - The absolute ground truth in RGBA
    const rgbaBufferRef = useRef(new Uint8ClampedArray(240 * 320 * 4));
    const lastHeartbeatRef = useRef(Date.now());
    const blackoutTimerRef = useRef<number | null>(null);

    // Initialize shadow buffer with alpha 255
    useEffect(() => {
        const buf = rgbaBufferRef.current;
        for (let i = 3; i < buf.length; i += 4) {
            buf[i] = 255;
        }
    }, []);

    // ATOMIC INGEST: Convert RGB -> RGBA immediately when new data arrives
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
    }, [state?.t, state?.powerOn, state?.reset, state?.buffer]);

    useEffect(() => {
        if (!canvasRef.current || !state) return;
        const ctx = canvasRef.current.getContext('2d', { alpha: false });
        if (!ctx) return;

        const paintBlack = () => {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 240, 320);
        };

        const paintFrame = () => {
            if (!state.powerOn || state.reset) {
                paintBlack();
                return;
            }

            const imgData = new ImageData(rgbaBufferRef.current, 240, 320);
            ctx.putImageData(imgData, 0, 0);
        };

        if (blackoutTimerRef.current !== null) {
            window.clearTimeout(blackoutTimerRef.current);
            blackoutTimerRef.current = null;
        }

        lastHeartbeatRef.current = Date.now();
        paintFrame();

        blackoutTimerRef.current = window.setTimeout(() => {
            if (Date.now() - lastHeartbeatRef.current >= 600) {
                paintBlack();
            }
        }, 600);

        return () => {
            if (blackoutTimerRef.current !== null) {
                window.clearTimeout(blackoutTimerRef.current);
                blackoutTimerRef.current = null;
            }
        };
    }, [state?.t, state?.powerOn, state?.reset, state?.buffer]);

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
                    <text x={w / 2} y="33" fill="#FFFFFF" fontSize="21" fontFamily="monospace" textAnchor="middle" fontWeight="bold">ILI9341</text>

                    {/* Screen Bezel */}
                    <rect x="8" y="42" width="224" height="290" fill="#F4E3EB" />

                    {/* Screen Dark Area */}
                    <rect x="12" y="46" width="216" height="282" fill="#000000" />

                    {/* The Simulation Canvas */}
                    <foreignObject x="12" y="46" width="216" height="282">
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

                    {/* Flex Cable Connector */}
                    <rect x={w / 2 - 60} y="323" width="120" height="18" fill="#b06423" />

                    {/* Pin Headers at 15px pitch */}
                    <rect x="54" y="348" width="132" height="12" fill="none" stroke="#FFFFFF" strokeWidth="0.75" opacity="0.7" />
                    {[60, 75, 90, 105, 120, 135, 150, 165, 180].map((x, i) => (
                        <circle key={i} cx={x} cy="352" r="2.25" fill="#FFFFFF" />
                    ))}
                </g>
            </svg>
        </div>
    );
};
