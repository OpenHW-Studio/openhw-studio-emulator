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
}
