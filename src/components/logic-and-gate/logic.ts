import { BaseComponent } from '../BaseComponent';

export class AndGateLogic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { input1High: false, input2High: false, outputHigh: false };
    }

    update(time: number, wires: any[], instances: BaseComponent[]) {
        super.update(time, wires, instances);

        const input1High = this.getPinVoltage('IN1') >= 2.5;
        const input2High = this.getPinVoltage('IN2') >= 2.5;
        const outputHigh = input1High && input2High;

        if (this.state.input1High !== input1High || this.state.input2High !== input2High || this.state.outputHigh !== outputHigh) {
            this.state.input1High = input1High;
            this.state.input2High = input2High;
            this.state.outputHigh = outputHigh;
            this.stateChanged = true;
        }

        const outVoltage = outputHigh ? 5.0 : 0.0;
        if (!this.pins['OUT']) this.pins['OUT'] = { voltage: 0, mode: 'OUTPUT' };
        this.pins['OUT'].voltage = outVoltage;
        if (this.id.includes('nd_gate')) {
            console.log(`[AND] update IN1=${this.getPinVoltage('IN1')} IN2=${this.getPinVoltage('IN2')} outputHigh=${outputHigh} outVoltage=${outVoltage} OUT.pinsV=${this.pins['OUT']?.voltage}`);
        }
        const outPinKey = `${this.id}:OUT`;
        const visited = new Set<string>();
        visited.add(outPinKey);

        const propagate = (pinKey: string, voltage: number) => {
            for (const w of wires) {
                const match = w.from === pinKey || w.to === pinKey;
                if (!match) continue;
                const otherKey = w.from === pinKey ? w.to : w.from;
                if (visited.has(otherKey)) continue;
                visited.add(otherKey);

                const [compId, compPin] = otherKey.split(':');
                const inst = instances.find(i => i.id === compId);
                if (!inst) continue;

                if (!inst.pins[compPin]) inst.pins[compPin] = { voltage: 0, mode: 'INPUT' };
                inst.setPinVoltage(compPin, voltage);

                if (inst.type === 'wokwi-resistor' || inst.type === 'openhw-resistor') {
                    const otherPin = compPin === 'p1' ? 'p2' : 'p1';
                    inst.setPinVoltage(otherPin, voltage);
                    const forwardKey = `${compId}:${otherPin}`;
                    if (!visited.has(forwardKey)) {
                        visited.add(forwardKey);
                        propagate(forwardKey, voltage);
                    }
                }
            }
        };

        propagate(outPinKey, outVoltage);
        if (this.id.includes('nd_gate')) {
            console.log(`[AND] post-propagate OUT.pinsV=${this.pins['OUT']?.voltage}`);
        }
    }

    getPinVoltage(pinId: string): number {
        if (pinId === 'OUT') {
            return this.state.outputHigh ? 5.0 : 0.0;
        }
        return super.getPinVoltage(pinId);
    }
}
