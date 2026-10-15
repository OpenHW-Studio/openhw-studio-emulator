import { I2SProtocol } from "../../protocol-handlers/i2s-device";

export class Logic extends I2SProtocol {
    constructor(id: string, manifest: any) {
        super(id, manifest);
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            bitsPerFrame: this.state.i2sBitsPerFrame || 16
        });
    }

    override onI2SFrame(channel: 0 | 1, sample: number, bitsPerFrame: number): void {
        super.onI2SFrame(channel, sample, bitsPerFrame);
        
        // Also drive the analog pins for visual/voltage logic
        const voltage = (sample / 2147483648) * 1.65 + 1.65; // centered at 1.65V (half of 3.3V)
        if (channel === 0) {
            this.setPinVoltage('OUTL', voltage);
        } else {
            this.setPinVoltage('OUTR', voltage);
        }
    }

    // 12.4 v2: numeric UI state for SAB slot {i0: playing} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {},
            i: {playing: (s.playing ? 1 : 0)},
        };
    }
    validate(_component: any, _graph: Map<string, string[]>) {
        return null;
    }
}
