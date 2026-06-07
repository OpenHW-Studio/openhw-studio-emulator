import { BaseComponent } from '../BaseComponent';

export class Mux2to1Logic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { d0High: false, d1High: false, selHigh: false, outputHigh: false };
    }

    update(time: number, wires: any[], instances: BaseComponent[]) {
        super.update(time, wires, instances);

        const d0High = this.getPinVoltage('D0') >= 2.5;
        const d1High = this.getPinVoltage('D1') >= 2.5;
        const selHigh = this.getPinVoltage('SEL') >= 2.5;
        const outputHigh = selHigh ? d1High : d0High;

        if (this.state.d0High !== d0High || this.state.d1High !== d1High ||
            this.state.selHigh !== selHigh || this.state.outputHigh !== outputHigh) {
            this.state.d0High = d0High;
            this.state.d1High = d1High;
            this.state.selHigh = selHigh;
            this.state.outputHigh = outputHigh;
            this.stateChanged = true;
        }

        const outVoltage = outputHigh ? 5.0 : 0.0;
        if (!this.pins['OUT']) this.pins['OUT'] = { voltage: 0, mode: 'OUTPUT' };
        this.pins['OUT'].voltage = outVoltage;
    }

    getPinVoltage(pinId: string): number {
        if (pinId === 'OUT') {
            return this.state.outputHigh ? 5.0 : 0.0;
        }
        return super.getPinVoltage(pinId);
    }
}
