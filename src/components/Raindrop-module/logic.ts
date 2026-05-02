import { BaseComponent } from '../BaseComponent';

export class RaindropModuleLogic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = {
            rainLevel: 0,
            rainDetected: false,
            threshold: 300,
            padVoltage: 5.0,
        };
        // Initialize PAD+ to 5V (dry) so AO doesn't read 0 before first update cycle
        if (this.pins['PAD+']) this.pins['PAD+'].voltage = 5.0;
    }

    onEvent(event: any) {
        if (event?.type === 'threshold_update') {
            const threshold = Math.max(0, Math.min(1023, Math.round(Number(event.value) || 300)));
            const rainDetected = this.state.rainLevel > threshold;
            this.setState({ threshold, rainDetected });
        }
    }

    update(_cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        const padVoltage = Math.max(0, Math.min(5, this.getPinVoltage('PAD+')));
        const rainLevel = Math.round((1 - padVoltage / 5) * 1023);
        const threshold = typeof this.state.threshold === 'number' ? this.state.threshold : 300;
        const rainDetected = rainLevel > threshold;

        const aoVoltage = padVoltage;
        const doVoltage = rainDetected ? 0.0 : 3.3;

        this.setPinVoltage('AO', aoVoltage);
        this.setPinVoltage('DO', doVoltage);
        this.setState({ rainLevel, rainDetected, padVoltage });

        // Propagate AO and DO through wires to connected components (e.g. Arduino pins)
        for (const wire of currentWires) {
            let otherId: string | null = null;
            let otherPin: string | null = null;
            let outVoltage = 0;

            if (wire[0] === this.id && wire[1] === 'AO') {
                otherId = wire[2]; otherPin = wire[3]; outVoltage = aoVoltage;
            } else if (wire[2] === this.id && wire[3] === 'AO') {
                otherId = wire[0]; otherPin = wire[1]; outVoltage = aoVoltage;
            } else if (wire[0] === this.id && wire[1] === 'DO') {
                otherId = wire[2]; otherPin = wire[3]; outVoltage = doVoltage;
            } else if (wire[2] === this.id && wire[3] === 'DO') {
                otherId = wire[0]; otherPin = wire[1]; outVoltage = doVoltage;
            }

            if (otherId && otherPin) {
                const inst = allComponentsInstances.find((c: BaseComponent) => c.id === otherId);
                if (inst) inst.setPinVoltage(otherPin, outVoltage);
            }
        }
    }
}
