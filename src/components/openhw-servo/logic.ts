import { BaseComponent } from '../BaseComponent';
import { PWMProtocol } from '../../protocol-handlers/index';

// Servo motor driven by standard RC PWM signal
//   Pulse width 544µs  → 0°
//   Pulse width 2400µs → 180°
//   Frequency: typically 50Hz (20ms period)
//
// The PWMProtocol base class handles:
//   - Debouncing / jitter filtering over a 4-sample rolling window
//   - Calling onPWMSignal() once a stable signal is detected

export class ServoLogic extends PWMProtocol {
    private targetAngle = -1;
    private lastUpdateCycle = 0;

    // Min/max pulse widths for SG90 / standard servos
    private static readonly MIN_US = 544;
    private static readonly MAX_US = 2400;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { ...this.state, angle: 0 };
    }

    // Override: tell PWMProtocol which pins to monitor
    getPWMPinNames(): string[] {
        return ['PWM', 'SIG', 'SIGNAL', 'IN', 'S'];
    }

    // Called by PWMProtocol when a stable, debounced PWM signal is measured
    onPWMSignal(pinId: string, frequencyHz: number, dutyCycle: number, pulseUs: number): void {
        let angle = (pulseUs - ServoLogic.MIN_US) * 180 / (ServoLogic.MAX_US - ServoLogic.MIN_US);
        angle = Math.max(0, Math.min(180, angle));
        this.targetAngle = angle;
    }

    onCustomTelemetry() {
        const target = this.targetAngle >= 0 ? this.targetAngle : this.state.angle;
        this.setCustomTelemetry({
            pulseWidthUs: this.state.pwmPulseUs,
            frequencyHz: Number((this.state.pwmFrequencyHz || 0).toFixed(3)),
            targetAngle: Number(target.toFixed(2)),
            distanceToTarget: Number(Math.abs(this.state.angle - target).toFixed(2)),
        });
    }

    update(cpuCycles: number, wires: any[], instances: BaseComponent[]) {
        super.update(cpuCycles, wires, instances);

        if (this.lastUpdateCycle === 0) {
            this.lastUpdateCycle = cpuCycles;
            if (this.targetAngle === -1) this.targetAngle = this.state.angle || 0;
            return;
        }

        const elapsedCycles = cpuCycles - this.lastUpdateCycle;
        this.lastUpdateCycle = cpuCycles;

        if (Math.abs(this.state.angle - this.targetAngle) > 0.1) {
            // Standard servo speed: ~400°/sec. At 16MHz, 1s = 16,000,000 cycles
            const maxMovement = 400 * (elapsedCycles / 16_000_000);

            if (this.state.angle < this.targetAngle) {
                this.state.angle = Math.min(this.targetAngle, this.state.angle + maxMovement);
            } else {
                this.state.angle = Math.max(this.targetAngle, this.state.angle - maxMovement);
            }
            this.stateChanged = true;
        }
    }
}
