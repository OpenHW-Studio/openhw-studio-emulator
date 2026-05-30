import { IDisplayRenderer, DisplayFrame } from '../IDisplayRenderer';

/**
 * SSD1306Renderer — Decodes 128×8-page VRAM and paints into an OffscreenCanvas.
 *
 * Runs entirely in the Render Worker. Replaces the requestAnimationFrame loop
 * that was previously running on the main thread in SSD1306UI.
 *
 * VRAM format: 8 pages × 128 columns = 1024 bytes.
 * Each byte encodes 8 vertical pixels (LSB = top pixel in the page).
 * The renderer handles: invert, allOn, segmentRemap, comScanDir, displayOffset, displayStartLine.
 */
export class SSD1306Renderer implements IDisplayRenderer {
    private ctx: OffscreenCanvasRenderingContext2D | null = null;
    private imgData: ImageData | null = null;

    // OLED phosphor "on" colour — bright blue-white
    private static readonly ON_R = 200;
    private static readonly ON_G = 243;
    private static readonly ON_B = 255;
    // Background colour — very dark grey
    private static readonly OFF_R = 34;
    private static readonly OFF_G = 34;
    private static readonly OFF_B = 34;

    mount(canvas: OffscreenCanvas): void {
        this.ctx = canvas.getContext('2d', { alpha: false });
        if (!this.ctx) return;

        this.imgData = new ImageData(128, 64);

        // Fill with background colour initially.
        const data = this.imgData.data;
        for (let i = 0; i < data.length; i += 4) {
            data[i]     = SSD1306Renderer.OFF_R;
            data[i + 1] = SSD1306Renderer.OFF_G;
            data[i + 2] = SSD1306Renderer.OFF_B;
            data[i + 3] = 255;
        }
        this.ctx.putImageData(this.imgData, 0, 0);
    }

    paint(frame: DisplayFrame): void {
        if (!this.ctx || !this.imgData) return;

        const {
            vram,
            displayOn,
            invert,
            allOn,
            displayStartLine,
            segmentRemap,
            comScanDir,
            displayOffset,
        } = frame.state || {};

        if (!displayOn) {
            this.ctx.fillStyle = '#222222';
            this.ctx.fillRect(0, 0, 128, 64);
            return;
        }

        if (!vram || !Array.isArray(vram)) return;

        const data = this.imgData.data;

        for (let page = 0; page < 8; page++) {
            for (let col = 0; col < 128; col++) {
                const vramIndex = (page * 128) + col;
                const byte = vram[vramIndex] ?? 0;

                for (let bit = 0; bit < 8; bit++) {
                    let isOn = (byte >> bit) & 1;
                    if (allOn) isOn = 1;
                    if (invert) isOn = isOn ? 0 : 1;

                    // Physical coordinate mapping (matches existing SSD1306UI logic)
                    let x = segmentRemap ? col : (127 - col);
                    let y = (page * 8) + bit;

                    y = (y - (displayStartLine ?? 0) + 64) % 64;
                    if (!comScanDir) y = 63 - y;
                    y = (y + (displayOffset ?? 0)) % 64;

                    const pixelIndex = (y * 128 + x) * 4;

                    data[pixelIndex]     = isOn ? SSD1306Renderer.ON_R  : SSD1306Renderer.OFF_R;
                    data[pixelIndex + 1] = isOn ? SSD1306Renderer.ON_G  : SSD1306Renderer.OFF_G;
                    data[pixelIndex + 2] = isOn ? SSD1306Renderer.ON_B  : SSD1306Renderer.OFF_B;
                    data[pixelIndex + 3] = 255;
                }
            }
        }

        this.ctx.putImageData(this.imgData, 0, 0);
    }

    destroy(): void {
        if (this.ctx) {
            this.ctx.fillStyle = '#222222';
            this.ctx.fillRect(0, 0, 128, 64);
        }
        this.ctx = null;
        this.imgData = null;
    }
}
