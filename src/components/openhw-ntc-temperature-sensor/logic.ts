import { BaseComponent } from '../BaseComponent';

export class NtcLogic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = {
            resistance: 10000,
            temperature: parseFloat(manifest.attrs?.temperature || '25'),
            beta: parseFloat(manifest.attrs?.beta || '3950'),
            r25: parseFloat(manifest.attrs?.r25 || '10000')
        };
        // Ensure frontend registry pins exist so setPinVoltage works
        if (!this.pins['OUT']) this.pins['OUT'] = { voltage: 0, mode: 'analog' };
        if (!this.pins['VCC']) this.pins['VCC'] = { voltage: 5, mode: 'power' };
        if (!this.pins['GND']) this.pins['GND'] = { voltage: 0, mode: 'ground' };
    }

    getConductance() {
        return 1e-12;
    }

    private computeResistance(): number {
        const tempC = parseFloat(String(this.state.temperature ?? this.attrs?.temperature ?? '25'));
        const beta = parseFloat(String(this.attrs?.beta || '3950'));
        const r25 = parseFloat(String(this.attrs?.r25 || '10000'));
        const tempK = tempC + 273.15;
        const t0K = 298.15;
        return r25 * Math.exp(beta * (1 / tempK - 1 / t0K));
    }

    getPinVoltage(pinId: string): number {
        if (pinId === 'OUT') {
            const r = this.state.resistance;
            const pullup = parseFloat(String(this.attrs?.r25 || this.state.r25 || '10000'));
            if (r && r > 1) {
                return 5.0 * r / (pullup + r);
            }
            const freshR = this.computeResistance();
            return 5.0 * freshR / (pullup + freshR);
        }
        return super.getPinVoltage(pinId);
    }

    update() {
        const tempAttr = this.state.temperature ?? this.attrs?.temperature;
        const tempC = tempAttr !== undefined ? parseFloat(String(tempAttr)) : 25;
        const resistance = this.computeResistance();
        const r25 = parseFloat(String(this.attrs?.r25 || this.state.r25 || '10000'));

        this.setState({
            resistance,
            temperature: tempC
        });

        const vOut = 5.0 * resistance / (r25 + resistance);

        this.setPinVoltage('OUT', vOut);
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            temperature: this.state.temperature.toFixed(1) + ' °C',
            resistance: (this.state.resistance / 1000).toFixed(1) + ' kΩ'
        });
    }

    onEvent(event: any) {
        if (event && (event.type === 'temperature' || event.type === 'input') && event.value !== undefined) {
            this.attrs.temperature = String(event.value);
            this.state.temperature = event.value;
            this.update();
            this.stateChanged = true;
        }
    }
}
