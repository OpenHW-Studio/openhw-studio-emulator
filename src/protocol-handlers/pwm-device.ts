import { BaseComponent } from '../components/BaseComponent';

export interface PWMMeta {
    frequencyHz: number;
    dutyCycle: number;
    pulseUs: number;
    periodUs: number;
}

export class PWMProtocol extends BaseComponent {
    private readonly windowSize = 4;
    private recentSamples: PWMMeta[] = [];

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = {
            ...this.state,
            pwmFrequencyHz: 0,
            pwmDutyCycle: 0,
            pwmPulseUs: 0,
            pwmPeriodUs: 0,
            pwmPin: null
        };
    }

    getPWMPinNames(): string[] {
        // Fallback names to look for
        return ['PWM', 'SIG', 'SIGNAL', 'IN', '1', 'D1', '0'];
    }

    private isMonitoredPin(pinId: string): boolean {
        const allowed = this.getPWMPinNames().map(p => p.toUpperCase());
        const upperPin = pinId.toUpperCase();
        if (allowed.includes(upperPin)) return true;

        if (Array.isArray(this.manifest?.pins)) {
            return this.manifest.pins.some((p: any) => String(p.id).toUpperCase() === upperPin);
        } else {
            return Object.keys(this.manifest?.pins || {}).some(p => p.toUpperCase() === upperPin);
        }
    }

    onPWMRawTick(pinId: string, meta: PWMMeta): void {
        // Optional override for raw ticks
    }

    onPWMSignal(pinId: string, frequencyHz: number, dutyCycle: number, pulseUs: number): void {
        // To be overridden by subclass
    }

    /**
     * Single fan-out for a settled PWM signal. Subclasses override
     * onPWMSignal(); WASM-heavy subclasses ALSO route via routePWM()
     * inside their override (see PwmBusFramer docs below). Keeping the
     * emit in one method guarantees the JS reference and the core see
     * the same settled values exactly once.
     */
    protected emitPwmSignal(pinId: string, frequencyHz: number, dutyCycle: number, pulseUs: number): void {
        this.onPWMSignal(pinId, frequencyHz, dutyCycle, pulseUs);
    }

    onPWM(pinId: string, meta: PWMMeta): void {
        if (!this.isMonitoredPin(pinId)) return;

        // Track the last edge cycle for silence detection in update()
        if ((meta as any).cycles !== undefined) {
            (this as any)._lastEdgeCycle = (meta as any).cycles;
        }

        // Ignore extremely fast glitches (e.g. noise > 1MHz or pulses < 1us)
        if (meta.pulseUs < 1 || meta.frequencyHz > 1000000) return;

        this.onPWMRawTick(pinId, meta);

        // Add to rolling window
        this.recentSamples.push(meta);
        if (this.recentSamples.length > this.windowSize) {
            this.recentSamples.shift();
        }

        if (this.recentSamples.length === this.windowSize) {
            // Check for stability (< 5% jitter)
            const freqs = this.recentSamples.map(m => m.frequencyHz);
            const pulses = this.recentSamples.map(m => m.pulseUs);

            const maxFreq = Math.max(...freqs);
            const minFreq = Math.min(...freqs);
            const maxPulse = Math.max(...pulses);
            const minPulse = Math.min(...pulses);

            const avgFreq = freqs.reduce((a, b) => a + b, 0) / this.windowSize;
            const avgPulse = pulses.reduce((a, b) => a + b, 0) / this.windowSize;

            const freqJitter = maxFreq - minFreq;
            const pulseJitter = maxPulse - minPulse;

            // If jitter is small relative to absolute value, or absolutely small
            if ((freqJitter / avgFreq < 0.05 || freqJitter < 5) &&
                (pulseJitter / avgPulse < 0.05 || pulseJitter < 10)) {

                const dutyCycle = this.recentSamples.reduce((a, b) => a + b.dutyCycle, 0) / this.windowSize;
                const periodUs = this.recentSamples.reduce((a, b) => a + b.periodUs, 0) / this.windowSize;

                // Throttling Logic for Fast PWM UI Updates
                const lastFreq = Number(this.state.pwmFrequencyHz || 0);
                const lastDuty = Number(this.state.pwmDutyCycle || 0);

                // Only force update if there's a significant change (>2% duty cycle or >5% freq)
                const freqChanged = Math.abs(avgFreq - lastFreq) / (lastFreq || 1) > 0.05;
                const dutyChanged = Math.abs(dutyCycle - lastDuty) > 0.02;

                // Or if enough time has passed (throttle to 60Hz / 16ms)
                const runner = (this as any)._runner;
                const nowMs = runner?.getSimulatedTimeMs ? runner.getSimulatedTimeMs() : Date.now();
                const lastUpdate = (this as any)._lastPwmUpdateMs || 0;
                const timePassed = (nowMs - lastUpdate) > 16;

                if (freqChanged || dutyChanged || timePassed) {
                    this.state.pwmFrequencyHz = avgFreq;
                    this.state.pwmDutyCycle = dutyCycle;
                    this.state.pwmPulseUs = avgPulse;
                    this.state.pwmPeriodUs = periodUs;
                    this.state.pwmPin = pinId;
                    this.stateChanged = true;
                    (this as any)._lastPwmUpdateMs = nowMs;

                    this.emitPwmSignal(pinId, avgFreq, dutyCycle, avgPulse);
                }
            }
        }
    }
}

/**
 * PwmBusFramer — composition helper for WASM-heavy components (§12.4).
 * Pure rolling-window stability detector (no update/WASM knowledge):
 * feed raw edge samples via pushSample(); when freq/duty settle, the
 * onSignal event fires EXACTLY like PWMProtocol.emitPwmSignal. A
 * WASM-heavy PWM component extends WasmComponent DIRECTLY, owns a
 * PwmBusFramer, and routes via routePWM() inside its onSignal handler.
 */
export interface PwmSignal {
    frequencyHz: number;
    dutyCycle: number;
    pulseUs: number;
    periodUs: number;
}

export interface PwmFrameEvents {
    onSignal?(pinId: string, signal: PwmSignal): void;
}

export class PwmBusFramer {
    private readonly windowSize = 4;
    private recent: { freqHz: number; pulseUs: number; dutyCycle: number; periodUs: number }[] = [];
    private last: { freqHz: number; dutyCycle: number } | null = null;
    private lastEmitMs = 0;
    constructor(private readonly events: PwmFrameEvents) {}

    /**
     * Feed one raw sample. Returns the settled signal when it fires,
     * null otherwise. Mirrors PWMProtocol thresholds (5% freq / 2% duty
     * change, 16ms throttle) so JS and WASM paths agree bit-for-bit.
     */
    pushSample(
        pinId: string, frequencyHz: number, dutyCycle: number,
        pulseUs: number, periodUs: number, nowMs: number,
    ): PwmSignal | null {
        if (pulseUs < 1 || frequencyHz > 1000000) return null;
        this.recent.push({ freqHz: frequencyHz, pulseUs, dutyCycle, periodUs });
        if (this.recent.length > this.windowSize) this.recent.shift();
        if (this.recent.length < this.windowSize) return null;
        const freqs = this.recent.map((m) => m.freqHz);
        const pulses = this.recent.map((m) => m.pulseUs);
        const avgFreq = freqs.reduce((a, b) => a + b, 0) / this.windowSize;
        const avgPulse = pulses.reduce((a, b) => a + b, 0) / this.windowSize;
        const freqJitter = Math.max(...freqs) - Math.min(...freqs);
        const pulseJitter = Math.max(...pulses) - Math.min(...pulses);
        if (!((freqJitter / avgFreq < 0.05 || freqJitter < 5)
            && (pulseJitter / avgPulse < 0.05 || pulseJitter < 10))) return null;
        const duty = this.recent.reduce((a, b) => a + b.dutyCycle, 0) / this.windowSize;
        const period = this.recent.reduce((a, b) => a + b.periodUs, 0) / this.windowSize;
        const lastFreq = this.last?.freqHz ?? 0;
        const lastDuty = this.last?.dutyCycle ?? 0;
        const freqChanged = Math.abs(avgFreq - lastFreq) / (lastFreq || 1) > 0.05;
        const dutyChanged = Math.abs(duty - lastDuty) > 0.02;
        const timePassed = (nowMs - this.lastEmitMs) > 16;
        if (!(freqChanged || dutyChanged || timePassed)) return null;
        this.last = { freqHz: avgFreq, dutyCycle: duty };
        this.lastEmitMs = nowMs;
        const signal: PwmSignal = { frequencyHz: avgFreq, dutyCycle: duty, pulseUs: avgPulse, periodUs: period };
        this.events.onSignal?.(pinId, signal);
        return signal;
    }
}
