import { BaseComponent } from '../BaseComponent';
import { raindropSharedState } from '../raindrop-shared-state';

export class RaindropPadLogic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { rainLevel: 0, limitExceeded: false };
        this.updateVoltages();
    }

    onEvent(event: any) {
        if (event?.type === 'rain_level') {
            const level = Math.max(0, Math.min(1023, Math.round(Number(event.value) || 0)));
            const threshold = raindropSharedState.threshold;
            
            // Invert scale: 1023 (WET) = 0V, 0 (DRY) = 5V
            const analogVoltage = parseFloat((((1023 - level) / 1023) * 5.0).toFixed(3));
            const limitExceeded = level > threshold;

            raindropSharedState.rainLevel    = level;
            raindropSharedState.rainDetected = limitExceeded;
            raindropSharedState.padVoltage   = analogVoltage;

            this.updateVoltages();
        }
    }

    private updateVoltages() {
        const digitalVoltage = raindropSharedState.rainDetected ? 0.0 : 5.0;
        this.setPinVoltage('AOUT', raindropSharedState.padVoltage);
        this.setPinVoltage('GND', 0);
    }

    update() {
        // Keep pins in sync every tick (fast, no setState overhead)
        this.updateVoltages();
    }

    // 12.4 v2: numeric UI state for SAB slot {f0: rainLevel, i0: limitExceeded} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {rainLevel: Number(s.rainLevel ?? 0)},
            i: {limitExceeded: (s.limitExceeded ? 1 : 0)},
        };
    }
    validate(_component: any, _graph: Map<string, string[]>) {
        return null;
    }
}
