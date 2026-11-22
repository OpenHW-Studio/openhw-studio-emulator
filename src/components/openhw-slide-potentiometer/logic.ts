import { BaseComponent } from '../BaseComponent';

export class SlidePotLogic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { value: 50 };
    }

    update(time: number, wires: any[], instances: BaseComponent[]) {
        super.update(time, wires, instances);
        let val = Number(this.state.value) || 0;
        const vcc = this.getPinVoltage('VCC');
        const gnd = this.getPinVoltage('GND');

        const sigV = gnd + (vcc - gnd) * (val / 100.0);
        this.setPinVoltage('SIG', sigV);
    }

    onCustomTelemetry() {
        const val = Number(this.state.value) || 0;
        const vcc = this.getPinVoltage('VCC');
        const gnd = this.getPinVoltage('GND');
        const sigV = gnd + (vcc - gnd) * (val / 100.0);

        this.setCustomTelemetry({
            resistanceRatio: Number((val / 100).toFixed(4)),
            signalVoltage: Number(sigV.toFixed(4)),
        });
    }

    getSyncState() {
        return { value: this.state.value };
    }

    // 12.4 v2: numeric UI state for SAB slot { f0: value }.
    uiState() {
        return {
            f: { value: Number(this.state?.value || 0) },
            i: {},
        };
    }

    validate(_component: any, _graph: Map<string, string[]>) {
        return null;
    }

    onEvent(event: any) {
        if (event && event.type === 'input' && event.value !== undefined) {
            this.state.value = event.value;
            this.stateChanged = true;
        }
    }
}
