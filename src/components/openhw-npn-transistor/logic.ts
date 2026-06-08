import { BaseComponent } from '../BaseComponent';

export class NPNTransistorLogic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = {};
    }

    onPinStateChange() {
        const vb = this.getPinVoltage('B');
        const vc = this.getPinVoltage('C');
        const ve = this.getPinVoltage('E');

        if (vb > 0.6) {
            // ON: transistor conducts C→E (saturation mode)
            // Pull Collector toward Emitter (low-side switch behavior)
            this.setPinVoltage('C', Math.min(vc, ve + 0.2));
            // Pull Emitter toward Collector
            this.setPinVoltage('E', Math.max(ve, vc - 0.2));
        } else {
            // OFF: high impedance, Collector floats to load voltage
            this.setPinVoltage('E', 0);
            this.setPinVoltage('C', 5.0);
        }
    }

    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        const vb = this.getPinVoltage('B');
        const vc = this.getPinVoltage('C');
        const ve = this.getPinVoltage('E');

        if (vb > 0.6) {
            this.setPinVoltage('C', Math.min(vc, ve + 0.2));
            this.setPinVoltage('E', Math.max(ve, vc - 0.2));
        } else {
            this.setPinVoltage('E', 0);
            this.setPinVoltage('C', 5.0);
        }
    }
}
