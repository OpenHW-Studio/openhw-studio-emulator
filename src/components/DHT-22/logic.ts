import { BaseComponent } from '../BaseComponent';

type ProtocolState = 'IDLE' | 'WAKE_WAIT' | 'ACKING' | 'SENDING';

// At 16 MHz: 1 µs = 16 cycles
const US = 16;

export class DHT22Logic extends BaseComponent {
    private protocolState: ProtocolState = 'IDLE';
    private wakeStartCycles: number = 0;

    private temperature: number = 24.0;
    private humidity: number = 50.0;

    private dataBits: boolean[] = [];
    private bitIndex: number = 0;

    // Guard: true while DHT actively drives DATA — prevents re-entrant onPinStateChange.
    private _drivingBus: boolean = false;

    // Injected by avr-runner / execute.ts
    private _simCpu?: any;
    private _simUpdatePhysics?: () => void;
    // Direct AVR port register writer — bypasses full repropagateAllVoltages cascade.
    // Signature: (boardPin: string, isHigh: boolean) => void
    private _setAvrPinDirect?: (boardPin: string, isHigh: boolean) => void;
    // Which board pin the DATA line is wired to (cached on first use)
    private _boardPin?: string | null;
    // Watchdog: CPU cycle when we entered ACKING/SENDING; if stuck, auto-reset.
    private _txStartCycle: number = 0;

    constructor(id: string, manifest: any) {
        super(id, manifest);

        const attrs = manifest?.attrs || {};
        this.temperature = Number(attrs.temperature ?? this.state?.temperature ?? 24.0);
        this.humidity    = Number(attrs.humidity    ?? this.state?.humidity    ?? 50.0);

        this.setState({ temperature: this.temperature, humidity: this.humidity });

        // Idle: hold DATA HIGH (open-drain with external pull-up)
        this.setPinVoltage('DATA', 5.0);
    }

    onEvent(event: any) {
        if (event.type === 'SET_ATTR') {
            if (event.key === 'temperature') {
                const val = Number(event.value);
                if (!isNaN(val)) { this.temperature = val; this.setState({ temperature: val }); this._boardPin = undefined; }
            } else if (event.key === 'humidity') {
                const val = Number(event.value);
                if (!isNaN(val)) { this.humidity = val; this.setState({ humidity: val }); this._boardPin = undefined; }
            }
        } else if (event.type === 'temperature') {
            const val = Number(event.value);
            if (!isNaN(val)) { this.temperature = val; this.setState({ temperature: val }); }
        } else if (event.type === 'humidity') {
            const val = Number(event.value);
            if (!isNaN(val)) { this.humidity = val; this.setState({ humidity: val }); }
        }
    }

    onPinStateChange(pin: string, isHigh: boolean, cycles: number) {
        if (pin === 'DATA' && this._drivingBus) return;

        if (pin === 'DATA') {
            if (!isHigh && this.protocolState === 'IDLE') {
                console.log(`[DHT22] WAKE_WAIT start (LOW) at ${cycles}`);
                this.protocolState = 'WAKE_WAIT';
                this.wakeStartCycles = cycles;
            } else if (isHigh && this.protocolState === 'WAKE_WAIT') {
                const wakeUs = (cycles - this.wakeStartCycles) / US;
                console.log(`[DHT22] WAKE_WAIT end (HIGH) at ${cycles}, wakeUs=${wakeUs}`);
                if (wakeUs >= 100) {
                    this.startAckSequence();
                } else {
                    this.protocolState = 'IDLE';
                }
            }
        }
    }

    private schedule(cb: () => void, delayCycles: number) {
        if (this._simCpu && typeof this._simCpu.addClockEvent === 'function') {
            this._simCpu.addClockEvent(cb, delayCycles);
        }
    }

    private getBoardPin(): string | null {
        if (this._boardPin !== undefined) return this._boardPin;
        this._boardPin = null;
        
        const cpu = this._simCpu as any;
        if (cpu?._avrRunner) {
            const runner = cpu._avrRunner;
            const myNode = `${this.id}:DATA`;
            const myNet = runner.pinToNet?.get(myNode);
            
            console.log(`[DHT22] getBoardPin: myNode=${myNode} myNet=${myNet}`);
            
            if (myNet !== undefined) {
                for (const [node, netId] of runner.pinToNet.entries()) {
                    if (netId === myNet && node.startsWith(runner.boardId + ':')) {
                        this._boardPin = node.split(':')[1];
                        console.log(`[DHT22] getBoardPin: Found board pin! node=${node} pin=${this._boardPin}`);
                        break;
                    }
                }
            }
        }
        return this._boardPin;
    }

    private driveData(voltage: number) {
        this._drivingBus = true;
        this.setPinVoltage('DATA', voltage);
        const isHigh = voltage > 1.8;
        // Write directly to AVR pin register to avoid the full repropagateAllVoltages
        // cascade which would cause the InputPullUp handler to fight us.
        if (this._setAvrPinDirect) {
            const boardPin = this.getBoardPin();
            if (boardPin) {
                console.log(`[DHT22] driveData: boardPin=${boardPin} isHigh=${isHigh} cycles=${this._simCpu?.cycles}`);
                this._setAvrPinDirect(boardPin, isHigh);
            } else {
                console.warn('[DHT22] driveData: boardPin NOT FOUND - falling back to simUpdatePhysics');
                if (this._simUpdatePhysics) this._simUpdatePhysics();
            }
        } else {
            console.warn('[DHT22] driveData: _setAvrPinDirect NOT injected - falling back to simUpdatePhysics');
            if (this._simUpdatePhysics) this._simUpdatePhysics();
        }
    }

    private releaseData() {
        this._drivingBus = false;
        this.protocolState = 'IDLE';
        this._txStartCycle = 0;
        this.setPinVoltage('DATA', 5.0);
        // Restore bus to HIGH and notify runner
        if (this._setAvrPinDirect) {
            const boardPin = this.getBoardPin();
            if (boardPin) this._setAvrPinDirect(boardPin, true);
        }
        if (this._simUpdatePhysics) this._simUpdatePhysics();
        console.log(`[DHT22] Release DATA at ${this._simCpu?.cycles}`);
    }

    private startAckSequence() {
        console.log(`[DHT22] ACKING sequence scheduled at ${this._simCpu?.cycles}`);
        this.protocolState = 'ACKING';
        this._txStartCycle = this._simCpu?.cycles ?? 0;
        this.schedule(() => this.sendAckLow(), 30 * US);
    }

    private sendAckLow() {
        console.log(`[DHT22] ACK LOW sent at ${this._simCpu?.cycles}`);
        this.driveData(0); 
        this.schedule(() => this.sendAckHigh(), 80 * US);
    }

    private sendAckHigh() {
        console.log(`[DHT22] ACK HIGH sent at ${this._simCpu?.cycles}`);
        this.driveData(5.0);
        this.schedule(() => {
            console.log(`[DHT22] SENDING bits at ${this._simCpu?.cycles}`);
            this.prepareDataBits();
            this.protocolState = 'SENDING';
            this.sendNextBit();
        }, 80 * US);
    }

    // ── Data payload ─────────────────────────────────────────────────────────

    private prepareDataBits() {
        // DHT22 40-bit frame (MSB first):
        //   Byte 0–1: Humidity × 10
        //   Byte 2–3: Temperature × 10  (bit15 = sign)
        //   Byte 4:   Checksum = (b0+b1+b2+b3) & 0xFF
        const h    = Math.round(this.humidity * 10);
        const tAbs = Math.round(Math.abs(this.temperature) * 10);
        const sign = this.temperature < 0 ? 0x80 : 0x00;

        const b0 = (h    >> 8) & 0xFF;
        const b1 =  h         & 0xFF;
        const b2 = ((tAbs >> 8) & 0x7F) | sign;
        const b3 =  tAbs       & 0xFF;
        const b4 = (b0 + b1 + b2 + b3) & 0xFF;

        this.dataBits = [];
        for (const byte of [b0, b1, b2, b3, b4]) {
            for (let i = 7; i >= 0; i--) {
                this.dataBits.push(!!((byte >> i) & 1));
            }
        }
        this.bitIndex = 0;
    }

    private sendNextBit() {
        if (this.bitIndex >= 40) {
            // End-of-frame: 50 µs LOW, then release.
            this.driveData(0);
            this.schedule(() => this.releaseData(), 50 * US);
            return;
        }

        const bit = this.dataBits[this.bitIndex++];

        // Each bit: 50 µs LOW preamble, then HIGH 26 µs ('0') or 70 µs ('1').
        this.driveData(0);
        this.schedule(() => {
            const highUs = bit ? 70 : 26;
            this.driveData(5.0);
            this.schedule(() => this.sendNextBit(), highUs * US);
        }, 50 * US);
    }

    // Watchdog: if stuck in ACKING/SENDING for >200ms (3.2M cycles), auto-reset.
    update(cycles: number) {
        if ((this.protocolState === 'ACKING' || this.protocolState === 'SENDING') &&
            this._txStartCycle > 0 &&
            (cycles - this._txStartCycle) > 3_200_000) {
            console.warn(`[DHT22] Watchdog: stuck in ${this.protocolState} for too long, resetting.`);
            this._drivingBus = false;
            this.protocolState = 'IDLE';
            this._txStartCycle = 0;
            this.setPinVoltage('DATA', 5.0);
            if (this._setAvrPinDirect) {
                const boardPin = this.getBoardPin();
                if (boardPin) this._setAvrPinDirect(boardPin, true);
            }
        }
    }
}
