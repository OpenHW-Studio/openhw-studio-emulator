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

        this.updateVoltages();
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

            this.updateVoltages();
        }
    }

    private updateVoltages() {
        const vcc = this.getPinVoltage('VCC') || this.getPinVoltage('5V');
        const gnd = this.getPinVoltage('GND');

        // Require both power pins to be physically connected — a floating GND
        // pin defaults to 0 V, which would make (vcc - gnd) pass even unwired.
        const vccConnected = this.state?.pins?.['VCC'] || this.state?.pins?.['5V'];
        const gndConnected = this.state?.pins?.['GND'];
        const hasPower = !!vccConnected && !!gndConnected && (vcc - gnd) >= 3.0;

        // Output voltages
        // AO outputs voltage proportional to gasLevel (0 to 1023 corresponds to 0V to VCC)
        const analogVoltage = hasPower ? (this.state.gasLevel / 1023) * vcc : 0.0;

        // DO outputs LOW (0V) when limit exceeded (Active Low like many real modules)
        // If not powered, it drops to 0V
        const digitalVoltage = hasPower ? (this.state.limitExceeded ? 0.0 : vcc) : 0.0;

        this.setPinVoltage('AO', analogVoltage);
        this.setPinVoltage('DO', digitalVoltage);
    }

    onPinStateChange(pinId: string, isHigh: boolean, cpuCycles: number) {
        if (pinId === 'VCC' || pinId === '5V' || pinId === 'GND') {
            this.updateVoltages();
        }
    }
}
