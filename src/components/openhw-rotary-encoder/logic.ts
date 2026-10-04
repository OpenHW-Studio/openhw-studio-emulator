import { BaseComponent } from '../BaseComponent';

export class RotaryEncoderLogic extends BaseComponent {
    private rotationCount = 0;
    private pressCount = 0;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { rot: 0, sw: false };
    }

    private quadratureStep = 0;
    private readonly quadratureSequence = [
        { clk: 1, dt: 1 }, // State 0: Idle (both high)
        { clk: 0, dt: 1 }, // State 1: Phase A leads
        { clk: 0, dt: 0 }, // State 2: Both low
        { clk: 1, dt: 0 }  // State 3: Phase B leads
    ];

    onEvent(event: string) {
        if (event === 'rotate-cw') {
            // Clockwise: Advance one step in sequence
            this.quadratureStep = (this.quadratureStep + 1) % 4;
            this.rotationCount++;
            this.updateQuadraturePins();
        } else if (event === 'rotate-ccw') {
            // Anticlockwise: Go back one step in sequence
            this.quadratureStep = (this.quadratureStep + 3) % 4;
            this.rotationCount--;
            this.updateQuadraturePins();
        } else if (event === 'press') {
            this.setState({ sw: true });
            this.pressCount++;
            this.setPinVoltage('SW', 0.0); // Active LOW
            this.stateChanged = true;
            this.driveBoardPin(false);
        } else if (event === 'release') {
            this.setState({ sw: false });
            this.setPinVoltage('SW', 5.0); // High when released
            this.stateChanged = true;
            this.driveBoardPin(true);
        }
    }

    // Runner repropagate sustain: the periodic input-pin sweep drives the
    // AVR pin from _lastDrivenVoltage for components exposing this method
    // (same contract as DHT22).
    private getConnectedBoardPin(): string | null {
        try {
            const netOf = (this as any)._boardNetOf;
            if (typeof netOf === 'function') {
                const pin = netOf('SW');
                if (pin) return pin;
            }
        } catch { /* fall through to wire scan */ }
        try {
            const runner = (this as any)._simCpu?._avrRunner;
            const wires = runner?.currentWires;
            if (Array.isArray(wires)) {
                for (const w of wires) {
                    const from: string = w.from || '';
                    const to: string = w.to || '';
                    if (from === `${this.id}:SW` && !to.startsWith(this.id + ':')) return to.split(':')[1] ?? null;
                    if (to === `${this.id}:SW` && !from.startsWith(this.id + ':')) return from.split(':')[1] ?? null;
                }
            }
        } catch { /* ignore */ }
        return null;
    }
    private getBoardPin(): string | null {
        try { return this.getConnectedBoardPin(); } catch { return null; }
    }

    // Drive the AVR input pin so firmware digitalRead observes the press.
    // setPinVoltage alone only moves the component-side net — the AVR PIN
    // register moves via board-pin drive (same _drivingBus contract as DHT).
    private driveBoardPin(isHigh: boolean) {
        try {
            (this as any)._drivingBus = true;
            (this as any)._lastDrivenVoltage = isHigh ? 5.0 : 0.0;
            const boardPin = this.getConnectedBoardPin();
            if (boardPin && typeof (this as any)._driveBoardPin === 'function') {
                (this as any)._driveBoardPin(boardPin, isHigh);
            } else if (boardPin && typeof (this as any)._setAvrPinDirect === 'function') {
                (this as any)._setAvrPinDirect(boardPin, isHigh);
            }
            try { (this as any)._simUpdatePhysics?.(); } catch { /* ignore */ }
        } catch { /* drive never breaks sim */ }
    }

    private updateQuadraturePins() {
        const step = this.quadratureSequence[this.quadratureStep];
        this.setPinVoltage('CLK', step.clk ? 5.0 : 0.0);
        this.setPinVoltage('DT', step.dt ? 5.0 : 0.0);
        // Also update internal state for UI feedback
        this.setState({ rot: (this.state.rot + (this.quadratureStep % 4 === 1 ? 5 : -5)) % 360 });
        this.stateChanged = true;
    }

    onPinStateChange() {
        // Initial setup
        if (this.state.sw === undefined) {
            this.setPinVoltage('SW', 5.0);
            this.setPinVoltage('CLK', 5.0);
            this.setPinVoltage('DT', 5.0);
        }
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            angle: Number(this.state.rot.toFixed(0)),
            buttonPressed: this.state.sw,
            totalRotations: this.rotationCount,
            totalPresses: this.pressCount,
            quadratureStep: this.quadratureStep,
        });
    }

    // 12.4 v2: numeric UI state for SAB slot { f0: rot, i0: sw }.
    uiState() {
        return {
            f: { rot: Number(this.state?.rot || 0) },
            i: { sw: this.state?.sw ? 1 : 0 },
        };
    }

    validate(component: any, graph: Map<string, string[]>) {
        const clk = graph.get(`${component.id}.CLK`) || [];
        const dt = graph.get(`${component.id}.DT`) || [];
        const gnd = graph.get(`${component.id}.GND`) || [];
        const issues = [];

        if (gnd.length === 0) {
            issues.push({
                ruleId: 'rotary-encoder-connection-check',
                severity: 'warn',
                message: `[Encoder ${component.id}] Ground (GND) is not connected.`,
                compIds: [component.id],
                remediation: 'Connect the encoder ground pin.',
                autoFix: true,
            });
        }

        if (clk.length === 0 || dt.length === 0) {
            issues.push({
                ruleId: 'rotary-encoder-connection-check',
                severity: 'warn',
                message: `[Encoder ${component.id}] Warning: Quadrature outputs (CLK/DT) must both be connected to track rotation.`,
                compIds: [component.id],
                remediation: 'Wire both CLK and DT to MCU inputs.',
                autoFix: true,
            });
        }

        return issues.length > 0 ? issues : null;
    }
}
