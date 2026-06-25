import { BaseComponent } from '../BaseComponent';

export class LdrModuleLogic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        // Sync initial attributes to state
        this.state = {
            light: manifest.attrs?.lux ?? 100,
            threshold: manifest.attrs?.threshold ?? 500,
            pwrLed: false,
            dOut: false
        };
    }

    // This handles updates from the Context Menu's onUpdate call
    onEvent(event: any) {
        if (event.type === 'SET_ATTR') {
            // Support both 'lux' and 'light' as the key for light level
            const key = event.key === 'lux' ? 'light' : event.key;
            this.state[key] = event.value;
            this.stateChanged = true;
        }
    }

    update(cpuCycles: number, wires: any[], instances: BaseComponent[]) {
        const vcc = this.getPinVoltage('VCC') || this.getPinVoltage('5V') || 5.0;
        const gnd = this.getPinVoltage('GND');

        if (vcc > 2.0 && gnd < 1.0) {
            this.state.pwrLed = true;

            // Analog Output (AO): 0 Lux = 0V, 1000 Lux = VCC
            const aoVoltage = vcc * (this.state.light / 1000);
            this.propagatePin('AO', aoVoltage, wires, instances);

            // Digital Output (DO): High if light > threshold
            const thresholdVolts = vcc * (this.state.threshold / 1000);
            const isHigh = aoVoltage > thresholdVolts;

            this.propagatePin('DO', isHigh ? vcc : 0, wires, instances);
            this.state.dOut = isHigh;
            this.stateChanged = true;
        } else {
            this.state.pwrLed = false;
            this.state.dOut = false;
            this.propagatePin('AO', 0, wires, instances);
            this.propagatePin('DO', 0, wires, instances);
            this.stateChanged = true;
        }
    }

    getSyncState() {
        return { ...this.state };
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            light: this.state.light,
            threshold: this.state.threshold,
            analogOutV: Number((this.getPinVoltage('AO') || 0).toFixed(2)),
            dOut: !!this.state.dOut
        });
    }
}
