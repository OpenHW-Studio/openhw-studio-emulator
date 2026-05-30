import React, { useEffect, useRef } from 'react';
import { useDisplayRenderWorker } from '../../display/DisplayRenderContext';

export const BOUNDS = { x: 0, y: 0, w: 240, h: 360 };

/**
 * ILI9341UI — React shell component.
 *
 * This component no longer paints pixels. All rendering happens in the
 * Render Worker (display.render.worker.ts) via OffscreenCanvas.
 *
 * On mount:
 *  1. Calls canvas.transferControlToOffscreen() — hands ownership to the Render Worker.
 *  2. Posts DISPLAY_MOUNT to the Render Worker with the OffscreenCanvas.
 *
 * On unmount:
 *  - Posts DISPLAY_UNMOUNT so the Render Worker can release resources.
 *
 * State (powerOn, reset, buffer) is routed directly from the Simulation Worker
 * to the Render Worker via MessageChannel — the main thread never sees pixel data.
 */
export const ILI9341UI = ({ state, comp }) => {
    const canvasRef = useRef(null);
    const renderWorker = useDisplayRenderWorker();
    const mountedRef = useRef(false);

    const compId = comp?.id || state?.compId || 'ili9341_unknown';

    useEffect(() => {
        if (!canvasRef.current || !renderWorker) return;
        if (mountedRef.current) return; // Already transferred — can only do this once per canvas.

        try {
            const offscreen = canvasRef.current.transferControlToOffscreen();
            renderWorker.postMessage(
                {
                    type: 'DISPLAY_MOUNT',
                    compId,
                    canvas: offscreen,
                    displayType: 'ili9341',
                    width: 240,
                    height: 320,
                },
                [offscreen] // Transfer ownership — zero-copy.
            );
            mountedRef.current = true;
        } catch (err) {
            // transferControlToOffscreen throws if the canvas was already transferred.
            // This can happen on React StrictMode double-invoke — safe to ignore.
        }

        return () => {
            if (mountedRef.current && renderWorker) {
                renderWorker.postMessage({ type: 'DISPLAY_UNMOUNT', compId });
                mountedRef.current = false;
            }
        };
        // renderWorker intentionally not in deps — it's stable for the simulation lifetime.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [compId, renderWorker]);

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

                    {/* The Simulation Canvas — control transferred to Render Worker on mount */}
                    <foreignObject x="12" y="46" width="216" height="282">
                        <canvas
                            key={renderWorker ? 'active' : 'inactive'}
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
