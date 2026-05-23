import { BaseComponent } from '../BaseComponent';

export class BatteryLogic extends BaseComponent {
    lastUpdate = Date.now();

    constructor(id: string, manifest: any) {
        super(id, manifest);
        const capacity = parseFloat(manifest.attrs?.capacityMah || '2000');
        const charge = parseFloat(manifest.attrs?.currentChargeMah || '2000');
        const voltage = parseFloat(manifest.attrs?.nominalVoltage || '3.7');
        this.state = {
            capacity,
            charge,
            voltage,
            isDead: false
        };
        if (this.pins['VCC']) {
            this.pins['VCC'].voltage = voltage;
            this.pins['VCC'].mode = 'OUTPUT';
        }
        if (this.pins['GND']) {
            this.pins['GND'].voltage = 0.0;
            this.pins['GND'].mode = 'OUTPUT';
        }
    }

    update(cpuCycles: number, currentWires: any[], allComponents: BaseComponent[], totalCurrentDraw: number = 0) {
        const now = Date.now();
        const dtHours = (now - this.lastUpdate) / (1000 * 60 * 60);
        this.lastUpdate = now;

        if (this.state.isDead) {
            this.setPinVoltage('VCC', 0.0);
            this.setPinVoltage('GND', 0.0);
            return;
        }

        // Calculate load current dynamically if telemetry is enabled
        let currentDrawA = 0.0;
        if (this.telemetryEnabled) {
            const targetPin = `${this.id}:VCC`;
            const visitedPins = new Set<string>();
            const queue = [targetPin];
            visitedPins.add(targetPin);

            while (queue.length > 0) {
                const currentPin = queue.shift()!;
                for (const wire of currentWires) {
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

            const visitedComps = new Set<string>();
            for (const pin of visitedPins) {
                const parts = pin.split(':');
                if (parts.length < 2) continue;
                const compId = parts[0];
                const pinName = parts.slice(1).join(':');

                if (compId === this.id || visitedComps.has(compId)) continue;

                const inst = allComponents.find(i => i.id === compId);
                if (!inst) continue;

                visitedComps.add(compId);

                if (inst.type.includes('led')) {
                    if (pinName === 'A' && typeof inst.state.current === 'number') {
                        currentDrawA += inst.state.current;
                    }
                } else if (inst.type.includes('resistor')) {
                    if (typeof inst.state.current === 'number') {
                        const otherPin = pinName === 'p1' ? 'p2' : 'p1';
                        if (!visitedPins.has(`${compId}:${otherPin}`)) {
                            currentDrawA += inst.state.current;
                        }
                    }
                } else if (inst.type.includes('a4988')) {
                    if (pinName === 'VMOT') {
                        currentDrawA += inst.state.active ? 1.0 : 0.05;
                    }
                } else if (inst.type.includes('servo')) {
                    if (pinName === 'V+' || pinName === 'VCC') {
                        if (inst.state.angle !== undefined && (inst as any).targetAngle !== undefined) {
                            const isMoving = Math.abs(inst.state.angle - ((inst as any).targetAngle ?? inst.state.angle)) > 0.1;
                            currentDrawA += isMoving ? 0.5 : 0.01;
                        } else {
                            currentDrawA += 0.01;
                        }
                    }
                } else if (inst.type.includes('motor-driver') || inst.type.includes('l293d')) {
                    if (pinName === '12V' || pinName === 'VCC' || pinName === '5V') {
                        currentDrawA += inst.state.active ? 0.8 : 0.01;
                    }
                }
            }
        }

        // Discharge based on total current draw
        const currentDrawMA = currentDrawA * 1000;
        const consumption = currentDrawMA * dtHours; 
        let newCharge = this.state.charge - consumption;

        let currentVoltage = this.state.voltage;
        if (newCharge <= 0) {
            newCharge = 0;
            currentVoltage = 0.0;
            this.setState({ charge: 0, isDead: true, voltage: 0 });
        } else {
            // Basic discharge curve simulation
            const percentage = newCharge / this.state.capacity;
            currentVoltage = 3.2 + (percentage * 1.0); // 3.2V to 4.2V range
            this.setState({ charge: newCharge, voltage: currentVoltage });
        }

        this.setPinVoltage('VCC', currentVoltage);
        this.setPinVoltage('GND', 0.0);
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            percentage: Math.round((this.state.charge / this.state.capacity) * 100),
            voltage: this.state.voltage.toFixed(2) + 'V',
            status: this.state.isDead ? 'Empty' : 'Discharging'
        });
    }
}
