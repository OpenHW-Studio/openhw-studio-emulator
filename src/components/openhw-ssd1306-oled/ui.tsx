import React, { useEffect, useRef } from 'react';
import { useDisplayRenderWorker } from '../../display/DisplayRenderContext';

// Bounding box for the selection ring
export const BOUNDS = { x: 0, y: 0, w: 135, h: 120 };

/**
 * SSD1306UI — React shell component.
 *
 * No longer runs a requestAnimationFrame loop or paints pixels on the main thread.
 * All rendering is delegated to the Render Worker via OffscreenCanvas.
 *
 * On mount:
 *  1. Calls canvas.transferControlToOffscreen() — hands ownership to Render Worker.
 *  2. Posts DISPLAY_MOUNT to the Render Worker with the OffscreenCanvas.
 *
 * VRAM state (vram, displayOn, invert, allOn, etc.) is routed from the Simulation Worker
 * directly to the Render Worker via MessageChannel — no main-thread involvement.
 */
export const SSD1306UI = ({ state, attrs, comp }) => {
    const canvasRef = useRef(null);
    const renderWorker = useDisplayRenderWorker();
    const mountedRef = useRef(false);

    const compId = comp?.id || 'ssd1306_unknown';

    useEffect(() => {
        if (!canvasRef.current || !renderWorker) return;
        if (mountedRef.current) return;

        try {
            const offscreen = canvasRef.current.transferControlToOffscreen();
            renderWorker.postMessage(
                {
                    type: 'DISPLAY_MOUNT',
                    compId,
                    canvas: offscreen,
                    displayType: 'ssd1306',
                    width: 128,
                    height: 64,
                },
                [offscreen]
            );
            mountedRef.current = true;
        } catch (err) {
            // Already transferred — React StrictMode double-invoke. Safe to ignore.
        }

        return () => {
            if (mountedRef.current && renderWorker) {
                renderWorker.postMessage({ type: 'DISPLAY_UNMOUNT', compId });
                mountedRef.current = false;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [compId, renderWorker]);

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
                style={{ display: 'block' }}
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

                {/* Canvas — control transferred to Render Worker on mount */}
                <foreignObject x="9" y="31" width="105.5" height="63">
                    <canvas
                        key={renderWorker ? 'active' : 'inactive'}
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
