import { BaseComponent } from '../BaseComponent';
import { raindropSharedState } from '../raindrop-shared-state';

export class RaindropModuleLogic extends BaseComponent {
    private lastUpdate = 0;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { rainLevel: 0, rainDetected: false, threshold: 300, padVoltage: 0 };
    }

    onEvent(event: any) {
        if (event?.type === 'threshold_update') {
            const threshold = Math.max(0, Math.min(1023, Math.round(Number(event.value) || 300)));
            raindropSharedState.threshold = threshold;
            this.setState({ threshold });
        }
    }

    update() {
        // Read from shared state (computed by Pad)
        const { padVoltage, rainLevel, rainDetected } = raindropSharedState;

        // Drive AO and DO for Arduino to read
        this.setPinVoltage('AO', padVoltage);
        this.setPinVoltage('DO', rainDetected ? 0.0 : 5.0);
        this.setPinVoltage('VCC', 5.0);
        this.setPinVoltage('GND', 0.0);

        const now = Date.now();
        if (now - this.lastUpdate > 100) {
            this.setState({ rainLevel, rainDetected, padVoltage });
            this.lastUpdate = now;
        }
    }

    // 12.4 v2: numeric UI state for SAB slot {f0: rainLevel, i0: rainDetected} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {rainLevel: Number(s.rainLevel ?? 0)},
            i: {rainDetected: (s.rainDetected ? 1 : 0)},
        };
    }
    validate(_component: any, _graph: Map<string, string[]>) {
        return null;
    }
}
