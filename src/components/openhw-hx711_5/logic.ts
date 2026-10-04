import { BaseComponent } from '../BaseComponent';

// HX711 load-cell amplifier (5kg variant; same model serves _50).
// Bit-banged 24-bit protocol on DT/SCK, ported to the current component
// API (the legacy this.pin()/init()/update(dt) API no longer exists):
//   - DT is an output driven onto the AVR pin (board-pin drive + the
//     _drivingBus sustain contract, same as keypad/rotary/DHT).
//   - SCK edges arrive via onPinStateChange (firmware bit-bang).
//   - Conversions latch at 10Hz in update(), keyed off cpu cycles.
//   - Load is set via attrs.load or onEvent({type:'input', load}).
export class HX711Logic extends BaseComponent {
    private load: number = 0;
    private pulseCount: number = 0;
    private lastSckHigh: boolean = false;
    private currentData: number = 0;
    private nextSampleCycle: number = 0;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        const initialLoad = parseFloat(manifest.attrs?.load ?? manifest.attrs?.value ?? '0');
        if (!isNaN(initialLoad)) this.load = initialLoad;
        this.state = { load: this.load, rawValue: 0, ready: false };
        // First conversion ready ~100ms after power-up (16MHz cycles).
        this.nextSampleCycle = 1600000;
        try { this.setPinVoltage('DT', 5.0); } catch { /* pins may init later */ }
    }

    onEvent(event: any) {
        try {
            let v: number | null = null;
            if (typeof event === 'string') {
                const m = event.match(/load\s*[:=]\s*(-?[\d.]+)/i);
                if (m) v = parseFloat(m[1]);
            } else if (event && typeof event === 'object') {
                if (event.load !== undefined) v = parseFloat(event.load);
                else if (event.value !== undefined) v = parseFloat(event.value);
            }
            if (v !== null && !isNaN(v)) {
                this.load = v;
                this.setState({ load: this.load });
                this.stateChanged = true;
            }
        } catch { /* ignore */ }
    }

    // Runner repropagate sustain: the periodic input-pin sweep drives the
    // AVR pin from _lastDrivenVoltage for components exposing this method
    // (same contract as DHT22/keypad/rotary).
    private getConnectedBoardPin(): string | null {
        try {
            const netOf = (this as any)._boardNetOf;
            if (typeof netOf === 'function') {
                const pin = netOf('DT');
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
                    if (from === `${this.id}:DT` && !to.startsWith(this.id + ':')) return to.split(':')[1] ?? null;
                    if (to === `${this.id}:DT` && !from.startsWith(this.id + ':')) return from.split(':')[1] ?? null;
                }
            }
        } catch { /* ignore */ }
        return null;
    }
    private getBoardPin(): string | null {
        try { return this.getConnectedBoardPin(); } catch { return null; }
    }

    private driveDT(isHigh: boolean) {
        try {
            try { this.setPinVoltage('DT', isHigh ? 5.0 : 0.0); } catch { /* ignore */ }
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

    onPinStateChange(pinId: string, isHigh: boolean, _cpuCycles: number): void {
        try {
            if (String(pinId || '').toUpperCase() !== 'SCK') return;
            const rising = isHigh && !this.lastSckHigh;
            this.lastSckHigh = isHigh;
            if (!rising) return;
            this.pulseCount++;
            if (this.pulseCount <= 24) {
                // Shift out MSB first.
                const bit = (this.currentData >> (24 - this.pulseCount)) & 1;
                this.driveDT(bit === 1);
            } else {
                // 25th+ pulse ends the conversion (gain/channel select);
                // DT returns HIGH until the next sample latches.
                this.driveDT(true);
            }
            this.stateChanged = true;
        } catch { /* ignore */ }
    }

    update(cycles: number, _wires?: any, _instances?: any): void {
        try {
            if (this.pulseCount >= 25) this.pulseCount = 0;
            if (this.pulseCount === 0 && cycles >= this.nextSampleCycle) {
                // Raw readings are 0-2100 for 0-5kg on the 5kg load cell.
                let rawValue = Math.round((this.load / 5) * 2100);
                // HX711 outputs 24-bit two's complement.
                if (rawValue < 0) rawValue = (1 << 24) + rawValue;
                this.currentData = rawValue & 0xffffff;
                this.setState({ rawValue: this.currentData, ready: true });
                // DT LOW = conversion ready.
                this.driveDT(false);
                this.nextSampleCycle = cycles + 1600000;
                this.stateChanged = true;
            }
        } catch { /* ignore */ }
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            loadKg: this.load,
            rawValue: this.currentData,
            dataReady: !this.dtHigh(),
            pulses: this.pulseCount,
        });
    }

    private dtHigh(): boolean {
        try { return this.getPinVoltage('DT') > 1.8; } catch { return true; }
    }

    // 12.4 v2: numeric UI state for SAB slot {f0: weight}.
    uiState() {
        return {
            f: { weight: Number((this as any).load ?? 0) },
            i: {},
        };
    }

    validate(component: any, graph: Map<string, string[]>) {
        const issues = [];
        const dt = graph.get(`${component.id}.DT`) || [];
        const sck = graph.get(`${component.id}.SCK`) || [];
        if (dt.length === 0 || sck.length === 0) {
            issues.push({
                ruleId: 'hx711-connection-check',
                severity: 'warn',
                message: `[HX711 ${component.id}] Warning: DT and SCK must both be connected for bit-banged reads.`,
                compIds: [component.id],
                remediation: 'Wire DT and SCK to MCU pins.',
            });
        }
        return issues.length > 0 ? issues : null;
    }
}
