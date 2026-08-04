import { BaseComponent } from '../BaseComponent';

type ProtocolState = 'IDLE' | 'WAKE_WAIT' | 'ACKING' | 'SENDING';

const DHT_LOG = false; // set to false to silence all DHT logs

function dhtLog(...args: any[]) {
    if (DHT_LOG) console.log('[DHT22]', ...args);
}

export class DHT22Logic extends BaseComponent {
    private protocolState: ProtocolState = 'IDLE';
    private wakeStartCycles: number = 0;

    private temperature: number = 24.0;
    private humidity: number = 50.0;

    private dataBits: boolean[] = [];
    private bitIndex: number = 0;

    // Injected by avr-runner.ts
    private _simCpu?: any;

    constructor(id: string, manifest: any) {
        super(id, manifest);

        this.temperature = this.state?.temperature ?? 24.0;
        this.humidity = this.state?.humidity ?? 50.0;

        this._setVoltageInternal(5.0);
        dhtLog(`[${id}] Constructed. T=${this.temperature} H=${this.humidity}`);
    }

    /**
     * Resolve the Arduino board pin (e.g. "5") connected to our DATA/SDA pin.
     * Cached after first successful lookup. Does NOT cache null (retries each call if not found).
     */
    private getConnectedBoardPin(): string | null {
        if ((this as any)._connectedPin != null) return (this as any)._connectedPin;
        const runner = this._simCpu?._avrRunner;
        if (runner?.currentWires) {
            for (const wire of runner.currentWires) {
                const from: string = wire.from || '';
                const to: string = wire.to || '';
                if (from.startsWith(this.id + ':')) {
                    const parts = to.split(':');
                    const pin = parts[1] ?? null;
                    if (pin) {
                        (this as any)._connectedPin = pin;
                        dhtLog(`[${this.id}] Resolved board pin = "${pin}" (from wire from="${from}" to="${to}")`);
                        return pin;
                    }
                } else if (to.startsWith(this.id + ':')) {
                    const parts = from.split(':');
                    const pin = parts[1] ?? null;
                    if (pin) {
                        (this as any)._connectedPin = pin;
                        dhtLog(`[${this.id}] Resolved board pin = "${pin}" (from wire from="${from}" to="${to}")`);
                        return pin;
                    }
                }
            }
        }
        // Do not cache null — retry next time so we find it once _simCpu is ready
        return null;
    }

    private _setVoltageInternal(voltage: number) {
        (this as any)._lastDrivenVoltage = voltage;
        if (this.pins['SDA']) this.pins['SDA'].voltage = voltage;
        if (this.pins['DATA']) this.pins['DATA'].voltage = voltage;
        try { this.setPinVoltage('SDA', voltage); } catch (_) {}
        try { this.setPinVoltage('DATA', voltage); } catch (_) {}
    }

    /**
     * Drive the data bus to a voltage level.
     * Fast path: _setAvrPinDirect writes directly to PIND (no netlist traversal).
     * Fallback: _simUpdatePhysics propagates through breadboard multi-hop paths.
     * Re-entrancy safe: repropagateAllVoltages uses customCompId guard so it never
     * calls onPinStateChange back on this component, and the ACKING/SENDING guard
     * in onPinStateChange provides a second layer of protection.
     */
    private drivePin(voltage: number) {
        this._setVoltageInternal(voltage);
        const isHigh = voltage > 1.8;

        // Fast path: directly write to AVR PIND register
        const boardPin = this.getConnectedBoardPin();
        if (boardPin && typeof (this as any)._setAvrPinDirect === 'function') {
            (this as any)._setAvrPinDirect(boardPin, isHigh);
        } else if (!boardPin) {
            dhtLog(`[${this.id}] WARN drivePin(${voltage.toFixed(1)}V): boardPin not resolved yet, relying on _simUpdatePhysics only`);
        }

        // Fallback: propagate through full netlist (handles breadboard multi-hop paths)
        this._simUpdatePhysics?.();
    }

    onEvent(event: any) {
        if (event.type === 'temperature') {
            this.temperature = event.value;
            this.setState({ temperature: this.temperature });
            dhtLog(`[${this.id}] onEvent → temperature=${this.temperature}`);
        } else if (event.type === 'humidity') {
            this.humidity = event.value;
            this.setState({ humidity: this.humidity });
            dhtLog(`[${this.id}] onEvent → humidity=${this.humidity}`);
        }
    }

    onPinStateChange(pin: string, isHigh: boolean, cycles: number) {
        // Log EVERY call so we can see unexpected re-entries
        dhtLog(`[${this.id}] onPinStateChange pin="${pin}" isHigh=${isHigh} state=${this.protocolState} cycles=${cycles}`);

        // Guard: ignore self-induced callbacks while driving the bus
        if (this.protocolState === 'ACKING' || this.protocolState === 'SENDING') {
            dhtLog(`[${this.id}]   → IGNORED (state=${this.protocolState})`);
            return;
        }
        if (pin !== 'SDA' && pin !== 'DATA') {
            dhtLog(`[${this.id}]   → IGNORED (wrong pin "${pin}")`);
            return;
        }

        if (!isHigh && this.protocolState === 'IDLE') {
            // Arduino pulled LOW — start signal begins
            this.protocolState = 'WAKE_WAIT';
            this.wakeStartCycles = cycles;
            dhtLog(`[${this.id}]   → IDLE→WAKE_WAIT (LOW detected at cycles=${cycles})`);

        } else if (isHigh && this.protocolState === 'WAKE_WAIT') {
            // Arduino released the bus — measure LOW duration
            const wakeUs = (cycles - this.wakeStartCycles) / 16;
            dhtLog(`[${this.id}]   → WAKE_WAIT got HIGH. wakeUs=${wakeUs.toFixed(1)}us (need ≥500us)`);

            if (wakeUs >= 500) {
                dhtLog(`[${this.id}]   → Starting ACK sequence`);
                this.startAckSequence();
            } else {
                dhtLog(`[${this.id}]   → Wake too short (${wakeUs.toFixed(1)}us < 500us) — ignored`);
                this.protocolState = 'IDLE';
            }

        } else {
            // Unexpected combination — log it so we can see what's happening
            dhtLog(`[${this.id}]   → UNEXPECTED: pin=${pin} isHigh=${isHigh} in state=${this.protocolState}`);
        }
    }

    private startAckSequence() {
        if (!this._simCpu) {
            dhtLog(`[${this.id}] startAckSequence: ABORT — _simCpu is null`);
            this.protocolState = 'IDLE';
            return;
        }
        this.protocolState = 'ACKING';
        dhtLog(`[${this.id}] startAckSequence: waiting 30us before ACK LOW`);
        this._simCpu.addClockEvent(() => this.sendAckLow(), 30 * 16);
    }

    private sendAckLow() {
        dhtLog(`[${this.id}] sendAckLow: driving LOW 80us`);
        this.drivePin(0);
        this._simCpu.addClockEvent(() => this.sendAckHigh(), 80 * 16);
    }

    private sendAckHigh() {
        dhtLog(`[${this.id}] sendAckHigh: driving HIGH 80us`);
        this.drivePin(5.0);
        this._simCpu.addClockEvent(() => {
            this.prepareDataBits();
            this.protocolState = 'SENDING';
            dhtLog(`[${this.id}] Starting data transmission (T=${this.temperature} H=${this.humidity})`);
            this.sendNextBit();
        }, 80 * 16);
    }

    private prepareDataBits() {
        // Re-read from component state in case sliders were changed
        if (this.state?.temperature !== undefined) this.temperature = Number(this.state.temperature);
        if (this.state?.humidity !== undefined) this.humidity = Number(this.state.humidity);

        const h = Math.min(1000, Math.max(0, Math.round(this.humidity * 10)));
        const rawT = Math.round(Math.abs(this.temperature) * 10);
        const tSign = this.temperature < 0 ? 0x8000 : 0x0000;
        const tEncoded = (rawT & 0x7FFF) | tSign;

        const b0 = (h >> 8) & 0xFF;
        const b1 = h & 0xFF;
        const b2 = (tEncoded >> 8) & 0xFF;
        const b3 = tEncoded & 0xFF;
        const b4 = (b0 + b1 + b2 + b3) & 0xFF;

        dhtLog(`[${this.id}] prepareDataBits: T=${this.temperature} H=${this.humidity} → bytes=[0x${b0.toString(16)},0x${b1.toString(16)},0x${b2.toString(16)},0x${b3.toString(16)}] cksum=0x${b4.toString(16)}`);

        this.dataBits = [];
        for (const b of [b0, b1, b2, b3, b4]) {
            for (let i = 7; i >= 0; i--) {
                this.dataBits.push(!!((b >> i) & 1));
            }
        }
        this.bitIndex = 0;
    }

    private sendNextBit() {
        if (!this._simCpu) return;

        if (this.bitIndex >= 40) {
            dhtLog(`[${this.id}] All 40 bits sent — ending with 50us LOW then idle HIGH`);
            this.drivePin(0);
            this._simCpu.addClockEvent(() => {
                this.drivePin(5.0);
                this.protocolState = 'IDLE';
                dhtLog(`[${this.id}] Transmission complete → IDLE`);
            }, 50 * 16);
            return;
        }

        const bit = this.dataBits[this.bitIndex++];

        // Each bit: 50us LOW preamble, then 28us HIGH = '0' or 70us HIGH = '1'
        this.drivePin(0);
        this._simCpu.addClockEvent(() => {
            this.drivePin(5.0);
            const highUs = bit ? 70 : 28;
            this._simCpu.addClockEvent(() => {
                this.sendNextBit();
            }, highUs * 16);
        }, 50 * 16);
    }

    update() {}
}
