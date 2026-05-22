import { BaseComponent } from '../components/BaseComponent';

export class AnalogProtocol extends BaseComponent {
    private readonly windowSize: number;
    private readonly threshold: number;
    private recentSamples: number[] = [];

    constructor(id: string, manifest: any) {
        super(id, manifest);
        
        this.windowSize = Number(manifest?.attrs?.avgSamples ?? 4);
        this.threshold = Number(manifest?.attrs?.voltageThreshold ?? 0.05);
        
        this.state = {
            ...this.state,
            voltage: 0,
            rawAdc: 0,
            averageVoltage: 0,
            analogPin: null
        };
    }

    getAnalogPinName(): string {
        return 'AO'; // Default
    }

    private getMonitoredPin(): string {
        const allowed = ['AO', 'SIG', 'OUT', 'AOUT', '1', this.getAnalogPinName().toUpperCase()];
        const pins = Object.keys(this.manifest?.pins || {});
        for (const p of pins) {
            if (allowed.includes(p.toUpperCase())) {
                return p;
            }
        }
        return this.getAnalogPinName();
    }

    onAnalogVoltageChange(pinId: string, voltage: number, rawAdc: number): void {
        // To be overridden
    }

    update(): void {
        const pinId = this.getMonitoredPin();
        const pinObj = this.pins[pinId];
        if (!pinObj) return;

        const voltage = pinObj.voltage || 0;
        
        this.recentSamples.push(voltage);
        if (this.recentSamples.length > this.windowSize) {
            this.recentSamples.shift();
        }

        const avgVoltage = this.recentSamples.reduce((a, b) => a + b, 0) / this.recentSamples.length;
        const currentAvg = Number(this.state.averageVoltage || 0);

        if (Math.abs(avgVoltage - currentAvg) >= this.threshold) {
            // Rough approximation of 10-bit ADC for convenience (5V ref)
            const rawAdc = Math.round((avgVoltage / 5.0) * 1023);
            
            this.state.voltage = voltage;
            this.state.averageVoltage = avgVoltage;
            this.state.rawAdc = rawAdc;
            this.state.analogPin = pinId;
            this.stateChanged = true;

            this.onAnalogVoltageChange(pinId, avgVoltage, rawAdc);
        }
    }
}
