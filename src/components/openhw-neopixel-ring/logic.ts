import { BaseComponent } from '../BaseComponent';
import { NeoPixelProtocol } from '../../protocol-handlers/index';

export class NeopixelRingLogic extends NeoPixelProtocol {
    private pixelsCount = 16;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.pixelsCount = parseInt(manifest.attrs?.pixels || '16', 10);
        this.state = { pixels: Array(this.pixelsCount).fill(0) };
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

    // 12.4 v2: numeric UI state for SAB slot {i0: enabled} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {},
            i: {enabled: (s.enabled ? 1 : 0)},
        };
    }
    validate(component: any, graph: Map<string, string[]>, validator?: any) {
        const pins = validator.getComponentPins(component);
        const vcc = pins.find((p:any) => p.includes('VCC') || p.includes('5V') || p.includes('3V3') || p.includes('V+'));
        const gnd = pins.find((p:any) => p.includes('GND'));

        if (vcc) {
            const node = `${component.id}.${vcc}`;
            if (((validator ? validator.getNeighbors(node) : (graph.get(node) || []))).length === 0) {
                return '⚠️ [' + component.type + ' ' + component.id + '] Power is not connected.';
            } else if (!validator.hasResistivePathToSupply(node)) {
                return '⚠️ [' + component.type + ' ' + component.id + '] Power is connected but does not reach a valid power supply rail.';
            }
        }

        if (gnd) {
            const node = `${component.id}.${gnd}`;
            if (((validator ? validator.getNeighbors(node) : (graph.get(node) || []))).length === 0) {
                return '⚠️ [' + component.type + ' ' + component.id + '] Ground is not connected.';
            } else {
                const gndSources = validator.collectVoltageSources(node);
                if (!gndSources.some((s: any) => s.voltage === 0)) {
                    return '⚠️ [' + component.type + ' ' + component.id + '] Ground is connected but does not reach a valid ground rail (GND).';
                }
            }
        }

        return null;
    }
}
