import { BaseComponent } from '../BaseComponent';

export class PowerSupplyLogic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = {};
        const voltageStr = manifest?.attrs?.voltage ?? '5.0';
        const voltage = parseFloat(voltageStr) || 0;
        if (this.pins['5V']) {
            this.pins['5V'].voltage = voltage;
            this.pins['5V'].mode = 'OUTPUT';
        }
        if (this.pins['GND']) {
            this.pins['GND'].voltage = 0.0;
            this.pins['GND'].mode = 'OUTPUT';
        }
    }

    update(time: number, wires: any[], instances: BaseComponent[]) {
        super.update(time, wires, instances);
        const voltageStr = this.state.voltage ?? '5.0';
        const voltage = parseFloat(voltageStr) || 0;
        this.setPinVoltage('5V', voltage);
        this.setPinVoltage('GND', 0.0);

        if (!this.telemetryEnabled) {
            if (this.state.current !== undefined) {
                this.state.current = undefined;
            }
            return;
        }

        // Trace the net connected to the '5V' pin to find all active load currents
        let totalCurrentA = 0.0;
        const targetPin = `${this.id}:5V`;

        // BFS wire trace to find all pins on the same net/rail
        const visitedPins = new Set<string>();
        const queue = [targetPin];
        visitedPins.add(targetPin);

        while (queue.length > 0) {
            const currentPin = queue.shift()!;
            for (const wire of wires) {
                if (wire.from === currentPin || wire.to === currentPin) {
                    const nextPin = wire.from === currentPin ? wire.to : wire.from;
                    const normNext = nextPin.trim();
                    if (!visitedPins.has(normNext)) {
                        visitedPins.add(normNext);
                        queue.push(normNext);
                    }
                }
            }
        }

        // Calculate current from connected components on the rail
        const visitedComps = new Set<string>();
        for (const pin of visitedPins) {
            const parts = pin.split(':');
            if (parts.length < 2) continue;
            const compId = parts[0];
            const pinName = parts.slice(1).join(':');

            if (compId === this.id || visitedComps.has(compId)) continue;

            const inst = instances.find(i => i.id === compId);
            if (!inst) continue;

            visitedComps.add(compId);

            // LED
            if (inst.type.includes('led')) {
                if (pinName === 'A' && typeof inst.state.current === 'number') {
                    totalCurrentA += inst.state.current;
                }
            }
            // Resistor
            else if (inst.type.includes('resistor')) {
                if (typeof inst.state.current === 'number') {
                    const otherPin = pinName === 'p1' ? 'p2' : 'p1';
                    if (!visitedPins.has(`${compId}:${otherPin}`)) {
                        totalCurrentA += inst.state.current;
                    }
                }
            }
            // Stepper Driver A4988
            else if (inst.type.includes('a4988')) {
                if (pinName === 'VMOT') {
                    totalCurrentA += inst.state.active ? 1.0 : 0.05;
                }
            }
            // Servo Motor
            else if (inst.type.includes('servo')) {
                if (pinName === 'V+' || pinName === 'VCC') {
                    if (inst.state.angle !== undefined && (inst as any).targetAngle !== undefined) {
                        const isMoving = Math.abs(inst.state.angle - ((inst as any).targetAngle ?? inst.state.angle)) > 0.1;
                        totalCurrentA += isMoving ? 0.5 : 0.01;
                    } else {
                        totalCurrentA += 0.01;
                    }
                }
            }
            // DC Motor Driver / L293D
            else if (inst.type.includes('motor-driver') || inst.type.includes('l293d')) {
                if (pinName === '12V' || pinName === 'VCC' || pinName === '5V') {
                    totalCurrentA += inst.state.active ? 0.8 : 0.01;
                }
            }
        }

        const totalCurrentMA = totalCurrentA * 1000;
        if (this.state.current !== totalCurrentMA) {
            this.setState({ current: totalCurrentMA });
        }
    }
}
