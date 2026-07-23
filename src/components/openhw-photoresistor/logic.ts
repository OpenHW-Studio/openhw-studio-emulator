import { BaseComponent } from '../BaseComponent';

export class PhotoresistorLogic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = {
            resistance: 10000,
            lux: parseFloat(manifest.attrs?.lux || '500')
        };
        // Ensure frontend registry pins '1' and '2' exist so setPinVoltage works
        if (!this.pins['1']) this.pins['1'] = { voltage: 0, mode: 'analog' };
        if (!this.pins['2']) this.pins['2'] = { voltage: 0, mode: 'analog' };
    }

    onEvent(event: any) {
        if (event.type === 'SET_ATTR') {
            this.attrs = this.attrs || {};
            this.attrs[event.key] = event.value;
            if (event.key === 'lux') {
                this.state.lux = parseFloat(event.value);
            }
            this.stateChanged = true;
        }
    }

    getConductance() {
        const lux = Math.max(0.1, parseFloat(this.attrs?.lux || '500'));
        const gamma = parseFloat(this.attrs?.gamma || '0.7');
        const r10 = parseFloat(this.attrs?.r10 || '10000');

        // R = R10 * (10 / Lux)^gamma
        const resistance = r10 * Math.pow(10 / lux, gamma);
        return 1 / resistance;
    }

    getPinVoltage(pinId: string): number {
        if (pinId === 'p2' || pinId === '2') {
            const lux = Number.parseFloat(String(this.state.lux)) || 0;
            
            // Linear 1:1 mapping for intuitive simulation
            const targetAdc = lux;
            const vOut = 5.0 * ((targetAdc + 0.1) / 1023.0);
            return vOut;
        }
        return super.getPinVoltage(pinId);
    }

    update(cycles: number) {
        if (!this.state.resistance || !this.state.lux) {
            this.state.resistance = 1000000;
            this.state.lux = 0;
        }

        const lux = Number.parseFloat(String(this.state.lux)) || 0;
        
        // Linear 1:1 mapping for intuitive simulation
        const targetAdc = lux;
        const vOut = 5.0 * ((targetAdc + 0.1) / 1023.0);

        this.setPinVoltage('p2', vOut);
        this.setPinVoltage('2', vOut);
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            lux: this.state.lux.toFixed(0) + ' lx',
            resistance: (this.state.resistance / 1000).toFixed(1) + ' kΩ'
        });
    }
}
