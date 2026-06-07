import { BaseComponent } from '../BaseComponent';

export class NtcLogic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        let temp = manifest.attrs?.temperature || '25';
        if (typeof sessionStorage !== 'undefined') {
            const saved = sessionStorage.getItem('openhw-ntc-temp-' + id) || sessionStorage.getItem('openhw-ntc-temp');
            if (saved) temp = saved;
        }
        this.state = {
            resistance: 10000,
            temperature: parseFloat(temp)
        };
    }

    getConductance() {
        const tempC = parseFloat(this.state.temperature ?? this.attrs?.temperature ?? '25');
        const beta = parseFloat(this.attrs?.beta || '3950');
        const r25 = parseFloat(this.attrs?.r25 || '10000');

        const tempK = tempC + 273.15;
        const t0K = 25 + 273.15;

        // R = R25 * exp(Beta * (1/T - 1/T0))
        const resistance = r25 * Math.exp(beta * (1 / tempK - 1 / t0K));
        return 1 / resistance;
    }

    update() {
        const tempC = parseFloat(this.state.temperature ?? this.attrs?.temperature ?? '25');
        const beta = parseFloat(this.attrs?.beta || '3950');
        const r25 = parseFloat(this.attrs?.r25 || '10000');
        
        const tempK = tempC + 273.15;
        const t0K = 25 + 273.15;
        const resistance = r25 * Math.exp(beta * (1 / tempK - 1 / t0K));

        this.setState({
            resistance,
            temperature: tempC
        });
    }

    onEvent(event: any) {
        if (event && event.type === 'temperature') {
            const tempC = parseFloat(event.value);
            this.attrs.temperature = tempC;
            this.setState({ temperature: tempC });
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem('openhw-ntc-temp-' + this.id, event.value);
                sessionStorage.setItem('openhw-ntc-temp', event.value);
            }
        }
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            temperature: this.state.temperature.toFixed(1) + ' °C',
            resistance: (this.state.resistance / 1000).toFixed(1) + ' kΩ'
        });
    }
}
