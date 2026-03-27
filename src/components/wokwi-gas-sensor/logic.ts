import { BaseComponent } from '../BaseComponent';

export class GasSensorLogic extends BaseComponent {
    private lastOutputTime: number = 0;

    constructor(id: string, manifest: any) {
        super(id, manifest);

        // Initialize default state
        const threshold = this.state?.threshold ?? 300;
        const gasLevel = this.state?.gasLevel ?? 0;

        this.state = {
            ...this.state,
            threshold,
            gasLevel,                     // Analog value 0-1023
            limitExceeded: gasLevel > threshold // Digital value
        };
    }

    onEvent(event: any) {
        if (event.type === 'gas_level') {
            const level = Math.max(0, Math.min(1023, Math.round(event.value)));
            const threshold = this.state?.threshold ?? 300;
            const limitExceeded = level > threshold;

            this.setState({
                gasLevel: level,
                limitExceeded
            });
        }
    }

    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        // Output voltages
        // AO outputs voltage proportional to gasLevel (0 to 1023 corresponds to 0V to 5V)
        const analogVoltage = (this.state.gasLevel / 1023) * 5.0;

        // We will output HIGH (5V) when limit exceeded to be more intuitive for users expecting "Detected" = HIGH.
        const digitalVoltage = this.state.limitExceeded ? 0.0 : 3.3;

        this.setPinVoltage('AO', analogVoltage);
        this.setPinVoltage('DO', digitalVoltage);
    }
}
