import { IDisplayRenderer, DisplayFrame } from '../IDisplayRenderer';

/**
 * ILI9341Renderer — Paints 240×320 RGB pixel frames into an OffscreenCanvas.
 *
 * Runs entirely in the Render Worker. The main thread never touches the canvas
 * after calling transferControlToOffscreen().
 *
 * Input buffer format: RGB (3 bytes per pixel), 240×320 = 230,400 bytes.
 * The renderer converts to RGBA in-place using a persistent shadow buffer.
 */
export class ILI9341Renderer implements IDisplayRenderer {
    private ctx: OffscreenCanvasRenderingContext2D | null = null;
    /** Shadow RGBA buffer — reused every frame to avoid GC pressure. */
    private rgbaBuffer = new Uint8ClampedArray(240 * 320 * 4);
    private blackoutTimer: ReturnType<typeof setTimeout> | null = null;
    private lastFrameTs = 0;
    private readonly BLACKOUT_TIMEOUT_MS = 600;

    constructor() {
        // Pre-set alpha channel to 255 (fully opaque) — never changes.
        for (let i = 3; i < this.rgbaBuffer.length; i += 4) {
            this.rgbaBuffer[i] = 255;
        }
    }

    mount(canvas: OffscreenCanvas): void {
        this.ctx = canvas.getContext('2d', { alpha: false });
        if (this.ctx) {
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, 240, 320);
        }
    }

    paint(frame: DisplayFrame): void {
        if (!this.ctx) return;

        this.lastFrameTs = frame.timestamp;

        // Clear any pending blackout timer — we just received a live frame.
        if (this.blackoutTimer !== null) {
            clearTimeout(this.blackoutTimer);
            this.blackoutTimer = null;
        }

        const { powerOn, reset } = frame.state || {};

        if (!powerOn || reset) {
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, 240, 320);
            return;
        }

        if (frame.buffer && frame.buffer.byteLength === 240 * 320 * 3) {
            // Convert RGB → RGBA using the persistent shadow buffer.
            const rgb = new Uint8Array(frame.buffer);
            const rgba = this.rgbaBuffer;
            for (let i = 0; i < 240 * 320; i++) {
                const src = i * 3;
                const dst = i * 4;
                rgba[dst]     = rgb[src];
                rgba[dst + 1] = rgb[src + 1];
                rgba[dst + 2] = rgb[src + 2];
                // rgba[dst + 3] is always 255, set in constructor.
            }
            const imgData = new ImageData(rgba, 240, 320);
            this.ctx.putImageData(imgData, 0, 0);
        }

        // Schedule a blackout if no new frames arrive within the timeout.
        this.blackoutTimer = setTimeout(() => {
            if (Date.now() - this.lastFrameTs >= this.BLACKOUT_TIMEOUT_MS && this.ctx) {
                this.ctx.fillStyle = '#000000';
                this.ctx.fillRect(0, 0, 240, 320);
            }
            this.blackoutTimer = null;
        }, this.BLACKOUT_TIMEOUT_MS);
    }

    destroy(): void {
        if (this.blackoutTimer !== null) {
            clearTimeout(this.blackoutTimer);
            this.blackoutTimer = null;
        }
        if (this.ctx) {
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, 240, 320);
        }
        this.ctx = null;
    }
}
