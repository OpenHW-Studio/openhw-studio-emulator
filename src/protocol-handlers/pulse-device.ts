import { BaseComponent } from '../components/BaseComponent';

/**
 * PulseProtocol — Abstraction for devices relying on precise pulse timing.
 * 
 * Provides:
 *  - Measuring incoming pulse durations automatically.
 *  - Sending outgoing pulses of exact durations.
 */
export class PulseProtocol extends BaseComponent {
    private lastEdgeTimes: Record<string, number> = {};
    private pendingPulses: { pinId: string, endCycle: number, idleVoltage: number }[] = [];

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = {
            ...this.state,
            lastPulseDurationUs: 0,
            lastPulsePin: null
        };
    }

    /**
     * Called when a full pulse (HIGH or LOW) is completed on a pin.
     * @param pinId The pin the pulse occurred on.
     * @param isHighPulse True if it was a HIGH pulse, false if it was a LOW pulse.
     * @param durationUs The duration of the pulse in microseconds.
     */
    onPulseReceived(pinId: string, isHighPulse: boolean, durationUs: number): void {
        // Subclasses should override this
    }

    onPinStateChange(pinId: string, isHigh: boolean, cycles: number): void {
        super.onPinStateChange(pinId, isHigh, cycles);

        const lastEdge = this.lastEdgeTimes[pinId];
        if (lastEdge > 0) {
            const durationUs = (cycles - lastEdge) / 16;
            // If the pin just went HIGH, the finished pulse was LOW (!isHigh)
            const wasHighPulse = !isHigh;
            
            this.state.lastPulseDurationUs = durationUs;
            this.state.lastPulsePin = pinId;
            this.stateChanged = true;

            this.onPulseReceived(pinId, wasHighPulse, durationUs);
        }
        this.lastEdgeTimes[pinId] = cycles;
    }

    /**
     * Transmit a pulse of exact duration on a specific pin.
     * @param pinId The pin to pulse.
     * @param isHigh True for a HIGH pulse, false for a LOW pulse.
     * @param durationUs Duration in microseconds.
     * @param idleVoltage The voltage to return to after the pulse (default 0).
     */
    sendPulse(pinId: string, isHigh: boolean, durationUs: number, idleVoltage: number = 0): void {
        this.setPinVoltage(pinId, isHigh ? 5.0 : 0.0);
        // Assuming 16MHz clock
        const endCycle = Number((this as any).lastCpuCycles || 0) + (durationUs * 16);
        this.pendingPulses.push({ pinId, endCycle, idleVoltage });
    }

    update(cpuCycles: number, wires: any[], instances: BaseComponent[]) {
        super.update(cpuCycles, wires, instances);
        (this as any).lastCpuCycles = cpuCycles;
        
        for (let i = this.pendingPulses.length - 1; i >= 0; i--) {
            if (cpuCycles >= this.pendingPulses[i].endCycle) {
                this.setPinVoltage(this.pendingPulses[i].pinId, this.pendingPulses[i].idleVoltage);
                this.pendingPulses.splice(i, 1);
            }
        }
    }
}
