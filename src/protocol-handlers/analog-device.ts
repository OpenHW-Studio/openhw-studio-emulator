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

        const avgVoltage = AnalogBusFramer.average(
            this.recentSamples, voltage, this.windowSize,
        );
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

/**
 * AnalogBusFramer — composition helper for WASM-heavy components (§12.4).
 * Pure moving-average + threshold detect (no update/WASM knowledge). The
 * static average()/adc() helpers are shared with AnalogProtocol above so
 * JS and WASM paths agree bit-for-bit. A WASM-heavy analog component
 * extends WasmComponent DIRECTLY, owns an AnalogBusFramer, feeds samples
 * via pushSample(), and routes via routeAnalog().
 */
export interface AnalogFrameEvents {
    onChange?(pinId: string, avgVoltage: number, rawAdc: number): void;
}

export class AnalogBusFramer {
    private recentSamples: number[] = [];
    private currentAvg = 0;
    constructor(
        private readonly windowSize: number,
        private readonly threshold: number,
        private readonly events: AnalogFrameEvents,
    ) {}

    /** Shared windowed average (mutates the caller's sample array). */
    static average(samples: number[], voltage: number, windowSize: number): number {
        samples.push(voltage);
        if (samples.length > windowSize) samples.shift();
        return samples.reduce((a, b) => a + b, 0) / samples.length;
    }

    /** Shared 10-bit ADC approximation (5V ref, matches protocol base). */
    static adc(avgVoltage: number): number {
        return Math.round((avgVoltage / 5.0) * 1023);
    }

    /**
     * Feed one sample; returns { avgVoltage, rawAdc } when the threshold
     * trips, else null. Mirrors AnalogProtocol thresholds exactly.
     */
    pushSample(pinId: string, voltage: number): { avgVoltage: number; rawAdc: number } | null {
        const avg = AnalogBusFramer.average(this.recentSamples, voltage, this.windowSize);
        if (Math.abs(avg - this.currentAvg) < this.threshold) return null;
        const rawAdc = AnalogBusFramer.adc(avg);
        this.currentAvg = avg;
        this.events.onChange?.(pinId, avg, rawAdc);
        return { avgVoltage: avg, rawAdc };
    }

    get averageVoltage(): number { return this.currentAvg; }
}
