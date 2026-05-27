import { BaseComponent } from '../BaseComponent';
import { PWMProtocol } from '../../protocol-handlers/index';

// Piezoelectric buzzer driven by a digital oscillating signal
//
// The PWMProtocol base class handles:
//   - Debouncing / jitter filtering over a 4-sample rolling window
//   - Calling onPWMSignal() once a stable audible frequency is detected
//
// Human hearing range: 20Hz – 20kHz
// Typical Arduino tone() frequencies: 100Hz – 15000Hz

export class BuzzerLogic extends PWMProtocol {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { ...this.state, isBuzzing: false, frequency: 0 };
    }

    // Override: buzzer can be on pin '1', '2', '+', or 'S'
    getPWMPinNames(): string[] {
        return ['1', '2', '+', 'S', 'SIG', 'IN'];
    }

    // Called by PWMProtocol when a stable, debounced PWM signal is measured
    onPWMSignal(pinId: string, frequencyHz: number, dutyCycle: number, pulseUs: number): void {
        // Only treat audible frequencies as buzzing
        if (frequencyHz >= 20 && frequencyHz <= 20_000) {
            const newBuzzing = true;
            const freqChanged = Math.abs((this.state.frequency || 0) - frequencyHz) / frequencyHz > 0.01;

            if (!this.state.isBuzzing || freqChanged) {
                this.setState({
                    isBuzzing: true,
                    frequency: frequencyHz,
                    voltageDrop: 3.3,
                    current: 0.015,
                });
            }
        }
    }

    // Silence detection — if PWMProtocol stops firing, the signal has gone quiet
    update(cpuCycles: number, wires: any[], instances: BaseComponent[]) {
        if ((this as any)._isToneBypassed) {
            return;
        }
        super.update(cpuCycles, wires, instances);

        // Detect clock speed from board type present in the simulation
        const hasPico = instances.some(c => c.type.includes('pico') || c.type.includes('rp2040'));
        const cpuHz = hasPico ? 125_000_000 : 16_000_000;

        // Silence timeout: 100ms of no edges
        const silenceTimeoutCycles = cpuHz * 0.1;
        const lastEdgeCycle: number = (this as any)._lastEdgeCycle || 0;
        if (lastEdgeCycle > 0 && (cpuCycles - lastEdgeCycle) > silenceTimeoutCycles) {
            if (this.state.isBuzzing) {
                this.setState({ isBuzzing: false, frequency: 0, current: 0, voltageDrop: 0 });
            }
        }
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            status: this.state.isBuzzing ? 'Buzzing' : 'Silent',
            frequency: this.state.isBuzzing ? Math.round(this.state.frequency) + ' Hz' : '0 Hz',
            voltageDrop: ((this.state.voltageDrop || 0) as number).toFixed(2) + ' V',
            current: (((this.state.current || 0) as number) * 1000).toFixed(2) + ' mA',
        });
    }
}
