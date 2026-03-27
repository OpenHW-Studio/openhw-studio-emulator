import { BaseComponent } from '../BaseComponent';

export class SoilMoistureSensorLogic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);

        this.state = {
            ...this.state,
            moistureLevel: 0 // 0 = totally dry, 1023 = fully wet
        };
    }

    onEvent(event: any) {
        if (event.type === 'moisture_level') {
            const level = Math.max(0, Math.min(1023, Math.round(event.value)));
            this.setState({ moistureLevel: level });
        }
    }

    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        // SIG outputs voltage inversely proportional to moisture
        // Real sensor: more moisture = lower resistance = lower analog reading
        // 0 moisture (dry) => ~4.2V (high reading ~860 ADC)
        // 1023 moisture (wet) => ~1.5V (low reading ~300 ADC)
        const moistureLevel = this.state.moistureLevel ?? 0;
        const voltage = 4.2 - (moistureLevel / 1023) * 2.7;
        this.setPinVoltage('SIG', voltage);
    }
}
