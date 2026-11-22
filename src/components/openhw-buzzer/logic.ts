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

    private _ticksSinceSignal = 0;
    private _seenEdgeCycle = -1;

    // Silence detection — if PWMProtocol stops firing, the signal has gone quiet
    update(cpuCycles: number, wires: any[], instances: BaseComponent[]) {
        if ((this as any)._isToneBypassed) {
            return;
        }
        super.update(cpuCycles, wires, instances);

        // Detect clock speed from board type present in the simulation
        // (instances may be a Map on the runner fast path — iterate both).
        let hasPico = false;
        const each = (fn: (c: any) => void) => {
            if (instances instanceof Map) { instances.forEach(fn); return; }
            (instances as BaseComponent[]).forEach(fn);
        };
        each((c) => {
            if (String(c?.type || '').includes('pico') || String(c?.type || '').includes('rp2040')) hasPico = true;
        });
        const cpuHz = hasPico ? 125_000_000 : 16_000_000;

        // Silence timeout: 100ms of no edges.
        //
        // Prefer the runner's clock service: `cpuCycles` is the runner's
        // monotonic STEP counter, and units-per-microsecond differ per board
        // (AVR 16, RP2040 125, RP2350 150). The old board-type scan below
        // never matched because the runner's instance map holds components
        // only — no board entry — so every Pico silently fell back to the
        // 16MHz AVR threshold (1.6M) while a single Pico tick is ~2M steps:
        // the buzzer was declared silent on every tick and never settled,
        // even with a continuous 2kHz signal on its pin.
        const cyclesPerUs = Number((this as any)._boardCyclesPerUs?.());
        const effectiveHz = (Number.isFinite(cyclesPerUs) && cyclesPerUs > 0)
            ? cyclesPerUs * 1_000_000
            : cpuHz;
        const lastEdgeCycle: number = (this as any)._lastEdgeCycle || 0;

        // Tick-counted silence window: engines advance the cycle counter
        // per-step-budget anywhere from instruction counts (AVR) to
        // hundreds of millions of guest cycles in one tick (Pico sleep
        // fast-forward), so any fixed cycle threshold is either too
        // tight (silences every tick) or never fires. A tone that keeps
        // driving updates _lastEdgeCycle every tick; silence is simply
        // "N consecutive update() ticks with no new edge stamp"
        // (~128 ms at a 16 ms tick ≈ the old 100 ms rule).
        if (lastEdgeCycle !== this._seenEdgeCycle) {
            this._seenEdgeCycle = lastEdgeCycle;
            this._ticksSinceSignal = 0;
        } else {
            this._ticksSinceSignal++;
        }

        if (lastEdgeCycle > 0 && this._ticksSinceSignal > 8) {
            if (this.state.isBuzzing) {
                this.setState({ isBuzzing: false, frequency: 0, current: 0, voltageDrop: 0 });
            }
        }
        void effectiveHz;
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            status: this.state.isBuzzing ? 'Buzzing' : 'Silent',
            frequency: this.state.isBuzzing ? Math.round(this.state.frequency) + ' Hz' : '0 Hz',
            voltageDrop: ((this.state.voltageDrop || 0) as number).toFixed(2) + ' V',
            current: (((this.state.current || 0) as number) * 1000).toFixed(2) + ' mA',
        });
    }

    // 12.4 v2: numeric UI state for SAB slot { f0: frequency, i0: isBuzzing }.
    uiState() {
        return {
            f: { frequency: Number(this.state?.frequency || 0) },
            i: { isBuzzing: this.state?.isBuzzing ? 1 : 0 },
        };
    }

    validate(component: any, graph: Map<string, string[]>) {
        const pin1a = graph.get(`${component.id}.GND`);
        const pin1b = graph.get(`${component.id}.1`);
        const pin2a = graph.get(`${component.id}.SIG`);
        const pin2b = graph.get(`${component.id}.2`);

        const side1Connected = Boolean((pin1a && pin1a.length > 0) || (pin1b && pin1b.length > 0));
        const side2Connected = Boolean((pin2a && pin2a.length > 0) || (pin2b && pin2b.length > 0));

        if (!side1Connected && !side2Connected) {
            return {
                ruleId: 'buzzer-series-resistor',
                severity: 'warn',
                message: `[Buzzer ${component.id}] Warning: Buzzer is not connected.`,
                compIds: [component.id],
                remediation: 'Wire the buzzer into the circuit.',
            };
        }

        return null;
    }
}
