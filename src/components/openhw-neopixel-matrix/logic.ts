import { BaseComponent } from '../BaseComponent';
import { NeoPixelProtocol } from '../../protocol-handlers/index';

export class NeopixelLogic extends NeoPixelProtocol {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { pixels: [] };
    }

    onNeoPixelFrame(pixels: number[]): void {
        this.state.pixels = pixels;
        this.stateChanged = true;
    }

    onCustomTelemetry() {
        const pixels: number[] = this.state.pixels || [];
        let activeCount = 0;
        let sumR = 0, sumG = 0, sumB = 0;

        for (const p of pixels) {
            if (p > 0) {
                activeCount++;
                sumR += (p >> 16) & 0xff;
                sumG += (p >> 8) & 0xff;
                sumB += p & 0xff;
            }
        }

        const count = pixels.length || 1;
        const avgColor = `rgb(${Math.round(sumR / count)}, ${Math.round(sumG / count)}, ${Math.round(sumB / count)})`;
        // Rough estimate: ~20mA per full brightness channel + 1mA idle per LED
        const estPowerMa = (pixels.length * 1) + ((sumR + sumG + sumB) / 255.0) * 20;

        let pattern = 'Steady';
        const idleTime = this.getStateIdleMs();
        if (idleTime < 2000 && activeCount > 0) pattern = 'Blinking/Animated';

        this.setCustomTelemetry({
            activePixels: activeCount,
            totalPixels: pixels.length,
            averageColor: avgColor,
            estimatedPowerMa: Number(estPowerMa.toFixed(2)),
            pattern: activeCount === 0 ? 'Off' : pattern
        });
    }
}
