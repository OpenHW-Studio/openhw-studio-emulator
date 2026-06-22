import { BaseComponent } from '../BaseComponent';

export class NtcLogic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = {
            resistance: 10000,
            temperature: parseFloat(manifest.attrs?.temperature || '25')
        };
        // Ensure frontend registry pins exist so setPinVoltage works
        if (!this.pins['OUT']) this.pins['OUT'] = { voltage: 0, mode: 'analog' };
        if (!this.pins['VCC']) this.pins['VCC'] = { voltage: 5, mode: 'power' };
        if (!this.pins['GND']) this.pins['GND'] = { voltage: 0, mode: 'ground' };
    }

    getConductance() {
        const tempC = parseFloat(this.attrs?.temperature || '25');
        const beta = parseFloat(this.attrs?.beta || '3950');
        const r25 = parseFloat(this.attrs?.r25 || '10000');

        const tempK = tempC + 273.15;
        const t0K = 25 + 273.15;

        // R = R25 * exp(Beta * (1/T - 1/T0))
        const resistance = r25 * Math.exp(beta * (1 / tempK - 1 / t0K));
        return 1 / resistance;
    }

    getPinVoltage(pinId: string): number {
        if (pinId === 'OUT') {
            const tempC = parseFloat(String(this.state.temperature)) || 25;
            const beta = parseFloat(String(this.attrs?.beta || '3950'));
            const r25 = parseFloat(String(this.attrs?.r25 || '10000'));
            const tempK = tempC + 273.15;
            const t0K = 25 + 273.15;
            
            const resistance = r25 * Math.exp(beta * (1 / tempK - 1 / t0K));
            
            // voltage divider logic: VCC -> 10k fixed -> OUT -> NTC -> GND
            const vIn = this.pins['VCC']?.voltage ?? 5.0; 
            const rFixed = 10000.0;
            return vIn * (resistance / (rFixed + resistance));
        }
        return super.getPinVoltage(pinId);
    }

    update() {
        const tempC = parseFloat(String(this.attrs?.temperature || '25'));
        const beta = parseFloat(String(this.attrs?.beta || '3950'));
        const r25 = parseFloat(String(this.attrs?.r25 || '10000'));
        
        const tempK = tempC + 273.15;
        const t0K = 25 + 273.15;
        const resistance = r25 * Math.exp(beta * (1 / tempK - 1 / t0K));

        this.setState({
            resistance,
            temperature: tempC
        });

        const vIn = this.pins['VCC']?.voltage ?? 5.0; 
        const rFixed = 10000.0;
        const vOut = vIn * (resistance / (rFixed + resistance));

        this.setPinVoltage('OUT', vOut);
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            temperature: this.state.temperature.toFixed(1) + ' °C',
            resistance: (this.state.resistance / 1000).toFixed(1) + ' kΩ'
        });
    }

    onEvent(event: any) {
        if (event && event.type === 'temperature' && event.value !== undefined) {
            this.attrs.temperature = String(event.value);
            this.state.temperature = event.value;
            this.update();
            this.stateChanged = true;
        }
    }
}
