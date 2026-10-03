import { BaseComponent } from '../components/BaseComponent';

export class OneWireProtocol extends BaseComponent {
    protected scratchpad: number[] = [];
    private activeReadBuffer: number[] = [];
    protected readBitIndex = 0;
    protected sendingBit = false;
    private romMatchCount = 0;
    private romMatchValid = true;
    private searchBitIndex = 0;
    private searchSlotStep = 0;
    protected ignoreNextSlot = false;

    // Guard: true while DS18B20 actively drives DQ — prevents re-entrant onPinStateChange.
    private _drivingBus: boolean = false;
    private _lastDrivenVoltage: number = 5.0;

    // Injected by avr-runner / execute.ts (same mechanism as DHT22)
    private _simCpu?: any;
    private _simUpdatePhysics?: () => void;
    // Direct AVR port register writer — bypasses full repropagateAllVoltages cascade.
    private _setAvrPinDirect?: (boardPin: string, isHigh: boolean) => void;
    // Which board pin the DQ line is wired to (cached on first use)
    private _boardPin?: string | null;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        
        this.state = {
            ...this.state,
            ow_state: 'IDLE',
            ow_romCmd: null,
            ow_funcCmd: null,
            ow_byteBuffer: [],
        };
    }

    isBusy(): boolean {
        return this.sendingBit || this._drivingBus;
    }

    getROMAddress(): number[] {
        return [0x28, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0xFF]; // Default DS18B20 style ROM
    }

    onConvertTemperature(): void {
        // To be overridden by subclass
    }

    onReadScratchpad(): number[] {
        // To be overridden by subclass
        return this.scratchpad;
    }

    setScratchpad(data: number[]): void {
        this.scratchpad = [...data];
    }

    // ── Board pin discovery (same approach as DHT22) ─────────────────────
    private getBoardPin(): string | null {
        if (this._boardPin !== undefined && this._boardPin !== null) return this._boardPin;

        // Runner-agnostic net query first (plan §5.3); legacy scan below.
        try {
            const netOf = (this as any)._boardNetOf;
            if (typeof netOf === 'function') {
                for (const pn of ['DQ', 'DATA']) {
                    const pin = netOf(pn);
                    if (pin) { this._boardPin = pin; return pin; }
                }
            }
        } catch { /* fall through to legacy scan */ }

        const cpu = this._simCpu as any;
        if (cpu?._avrRunner) {
            const runner = cpu._avrRunner;
            // Try all known DQ pin names
            const pinNames = ['DQ', 'dq', 'DATA', 'data'];
            let myNet: number | undefined;
            for (const pn of pinNames) {
                myNet = runner.pinToNet?.get(`${this.id}:${pn}`);
                if (myNet !== undefined) break;
            }
            
            if (myNet !== undefined) {
                for (const [node, netId] of runner.pinToNet.entries()) {
                    if (netId === myNet && node.startsWith(runner.boardId + ':')) {
                        let pinStr = node.split(':')[1];
                        if (/^D\d+$/i.test(pinStr)) pinStr = pinStr.substring(1);
                        this._boardPin = pinStr;
                        break;
                    }
                }
            }
        }
        return this._boardPin ?? null;
    }

    // ── Drive DQ line (same pattern as DHT22.driveData) ──────────────────
    private driveDQ(pinId: string, voltage: number) {
        this._drivingBus = true;
        this._lastDrivenVoltage = voltage;
        this.setPinVoltage(pinId, voltage);
        const isHigh = voltage > 1.8;
        // Board drive via the bus service when available (plan §5.3);
        // legacy AVR-only path otherwise.
        if (this._driveBoardPin) {
            const boardPin = this.getBoardPin();
            if (boardPin) {
                this._driveBoardPin(boardPin, isHigh);
            } else {
                if (this._simUpdatePhysics) this._simUpdatePhysics();
            }
        } else if (this._setAvrPinDirect) {
            const boardPin = this.getBoardPin();
            if (boardPin) {
                this._setAvrPinDirect(boardPin, isHigh);
            } else {
                if (this._simUpdatePhysics) this._simUpdatePhysics();
            }
        } else {
            if (this._simUpdatePhysics) this._simUpdatePhysics();
        }
    }

    private releaseDQ(pinId: string) {
        this._lastDrivenVoltage = 5.0;
        this._drivingBus = false;
        this.sendingBit = false;
        this.setPinVoltage(pinId, 5.0);
        // Restore bus to HIGH and notify runner (bus service first).
        if (this._driveBoardPin) {
            const boardPin = this.getBoardPin();
            if (boardPin) this._driveBoardPin(boardPin, true);
        } else if (this._setAvrPinDirect) {
            const boardPin = this.getBoardPin();
            if (boardPin) this._setAvrPinDirect(boardPin, true);
        }
        if (this._simUpdatePhysics) this._simUpdatePhysics();
    }

    private schedule(cb: () => void, delayCycles: number) {
        const simCpu = (this as any)._simCpu;
        if (simCpu && typeof simCpu.addClockEvent === 'function') {
            simCpu.addClockEvent(cb, delayCycles);
        }
    }

    onOneWireReset(pinId: string, meta: any): void {
        this.state.ow_state = 'RESET';
        this.state.ow_byteBuffer = [];
        this.activeReadBuffer = [];
        this.readBitIndex = 0;
        this.sendingBit = false;
        this._drivingBus = false;
        this.romMatchCount = 0;
        this.romMatchValid = true;
        this.searchBitIndex = 0;
        this.searchSlotStep = 0;
        this.ignoreNextSlot = false;
        this.stateChanged = true;

        // Schedule Presence Pulse: wait ~30 µs (480 AVR cycles @ 16 MHz), pull low for ~120 µs (1920 AVR cycles @ 16 MHz)
        this.schedule(() => {
            this.sendingBit = true;
            this.driveDQ(pinId, 0.0);

            this.schedule(() => {
                this.releaseDQ(pinId);
            }, 1920);
        }, 480);
    }

    onOneWireWriteBit(pinId: string, bit: number, meta: any): void {
        if (this.state.ow_state === 'IDLE') return;

        // If we just sent a bit or presence pulse by holding the line low, ignore our own echo
        if (this.sendingBit || this._drivingBus) return;

        // If in SEARCH_ROM and master is sending direction bit
        if (this.state.ow_state === 'SEARCH_ROM') {
            if (this.searchSlotStep !== 2) return;
            const romAddr = this.getROMAddress();
            const romBit = (romAddr[Math.floor(this.searchBitIndex / 8)] >> (this.searchBitIndex % 8)) & 1;
            if (bit === romBit) {
                this.searchBitIndex++;
                this.searchSlotStep = 3;
                if (this.searchBitIndex >= 64) {
                    this.state.ow_state = 'IDLE';
                }
            } else {
                this.state.ow_state = 'IDLE'; // Mismatch, drop out of search
            }
            return;
        }

        // If we are in DATA state, master is reading, do not accumulate bits
        if (this.state.ow_state === 'DATA') {
            return;
        }

        this.state.ow_byteBuffer.push(bit);
        
        if (this.state.ow_byteBuffer.length === 8) {
            const byte = this.state.ow_byteBuffer.reduce((acc: number, b: number, i: number) => acc | (b << i), 0);
            this.state.ow_byteBuffer = [];
            this.ignoreNextSlot = true;

            if (this.state.ow_state === 'RESET') {
                this.state.ow_romCmd = byte;
                if (byte === 0xCC) { // SKIP ROM
                    this.state.ow_state = 'FUNCTION_CMD';
                } else if (byte === 0x33) { // READ ROM
                    this.state.ow_state = 'DATA';
                    this.activeReadBuffer = [...this.getROMAddress()];
                    this.readBitIndex = 0;
                } else if (byte === 0x55) { // MATCH ROM
                    this.state.ow_state = 'ROM_MATCH';
                    this.romMatchCount = 0;
                    this.romMatchValid = true;
                } else if (byte === 0xF0) { // SEARCH ROM
                    this.state.ow_state = 'SEARCH_ROM';
                    this.searchBitIndex = 0;
                    this.searchSlotStep = 0;
                } else {
                    this.state.ow_state = 'ROM_CMD';
                }
            } else if (this.state.ow_state === 'ROM_MATCH') {
                const expectedByte = this.getROMAddress()[this.romMatchCount] ?? 0;
                if (byte !== expectedByte) {
                    this.romMatchValid = false;
                }
                this.romMatchCount++;
                if (this.romMatchCount >= 8) {
                    if (this.romMatchValid) {
                        this.state.ow_state = 'FUNCTION_CMD';
                    } else {
                        this.state.ow_state = 'IDLE';
                    }
                }
            } else if (this.state.ow_state === 'FUNCTION_CMD') {
                this.state.ow_funcCmd = byte;
                
                if (byte === 0x44) { // Convert T
                    this.onConvertTemperature();
                    this.state.ow_state = 'DATA';
                    this.activeReadBuffer = [0xFF]; // 0xFF = conversion complete
                    this.readBitIndex = 0;
                } else if (byte === 0xBE) { // Read Scratchpad
                    this.setScratchpad(this.onReadScratchpad());
                    this.state.ow_state = 'DATA';
                    this.activeReadBuffer = [...this.scratchpad];
                    this.readBitIndex = 0;
                } else {
                    this.state.ow_state = 'DATA';
                    this.activeReadBuffer = [...this.scratchpad];
                    this.readBitIndex = 0;
                }
            }
            this.stateChanged = true;
        }
    }

    onOneWireSlot(pinId: string, meta: any): void {
        if (this.sendingBit || this._drivingBus) {
            this.sendingBit = false;
            return;
        }

        if (this.ignoreNextSlot) {
            this.ignoreNextSlot = false;
            return;
        }

        if (this.state.ow_state === 'SEARCH_ROM') {
            if (this.searchSlotStep === 3) {
                this.searchSlotStep = 0;
                return;
            }
            const romAddr = this.getROMAddress();
            const romBit = (romAddr[Math.floor(this.searchBitIndex / 8)] >> (this.searchBitIndex % 8)) & 1;
            let outBit = 1;
            if (this.searchSlotStep === 0) {
                outBit = romBit;
                this.searchSlotStep = 1;
            } else if (this.searchSlotStep === 1) {
                outBit = romBit ? 0 : 1;
                this.searchSlotStep = 2;
            } else {
                return;
            }

            if (outBit === 0) {
                this.triggerLowPulse(pinId);
            }
            return;
        }

        if (this.state.ow_state === 'DATA') {
            const buffer = (this.activeReadBuffer && this.activeReadBuffer.length > 0) ? this.activeReadBuffer : this.scratchpad;
            const byteIndex = Math.floor(this.readBitIndex / 8);
            const bitOffset = this.readBitIndex % 8;
            
            if (byteIndex < buffer.length) {
                const byte = buffer[byteIndex];
                const outBit = (byte >> bitOffset) & 1;
                
                if (outBit === 0) {
                    this.triggerLowPulse(pinId);
                }
            }
            this.readBitIndex++;
        }
    }

    private triggerLowPulse(pinId: string): void {
        this.sendingBit = true;
        this.driveDQ(pinId, 0.0);

        // Hold LOW for ~30 µs (480 AVR cycles @ 16 MHz), then release
        this.schedule(() => {
            this.releaseDQ(pinId);
        }, 480);
    }
}

/**
 * OneWireBusFramer — composition helper for WASM-heavy components (§12.4).
 * Pure ROM/state machine for the DS18B20-style flow (no _simCpu/_runner
 * knowledge — bus driving stays in the component). Feed reset/writeBit/
 * slot events; the framer returns response bits for DATA/SEARCH_ROM reads
 * via onReadBit. A WASM-heavy 1-Wire component extends WasmComponent
 * DIRECTLY, owns a OneWireBusFramer, and routes via
 * routeOneWire(0|1|2, pinId, arg) — kind 2 returns the response bit.
 */
export interface OneWireFrameEvents {
    onConvertTemperature?(): void;
    onReadScratchpad?(): number[];
    getROMAddress?(): number[];
}

export class OneWireBusFramer {
    private owState: 'IDLE' | 'RESET' | 'ROM_MATCH' | 'SEARCH_ROM' | 'FUNCTION_CMD' | 'DATA' | 'ROM_CMD' = 'IDLE';
    private byteBuffer: number[] = [];
    private readBuffer: number[] = [];
    private readBitIndex = 0;
    private romMatchCount = 0;
    private romMatchValid = true;
    private searchBitIndex = 0;
    private searchSlotStep = 0;
    private ignoreNextSlot = false;
    private scratchpad: number[] = [];
    constructor(private readonly events: OneWireFrameEvents) {}

    private rom(): number[] {
        return this.events.getROMAddress?.() ?? [0x28, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0xFF];
    }

    /** Master reset pulse: returns to RESET, clears buffers. */
    reset(): void {
        this.owState = 'RESET';
        this.byteBuffer = [];
        this.readBuffer = [];
        this.readBitIndex = 0;
        this.romMatchCount = 0;
        this.romMatchValid = true;
        this.searchBitIndex = 0;
        this.searchSlotStep = 0;
        this.ignoreNextSlot = false;
    }

    /** Master write bit (ignored while self-driving — caller guards). */
    writeBit(bit: number): void {
        if (this.owState === 'IDLE') return;
        if (this.owState === 'SEARCH_ROM') {
            if (this.searchSlotStep !== 2) return;
            const romAddr = this.rom();
            const romBit = (romAddr[Math.floor(this.searchBitIndex / 8)] >> (this.searchBitIndex % 8)) & 1;
            if (bit === romBit) {
                this.searchBitIndex++;
                this.searchSlotStep = 3;
                if (this.searchBitIndex >= 64) this.owState = 'IDLE';
            } else {
                this.owState = 'IDLE';
            }
            return;
        }
        if (this.owState === 'DATA') return; // master is reading
        this.byteBuffer.push(bit & 1);
        if (this.byteBuffer.length < 8) return;
        const byte = this.byteBuffer.reduce((acc, b, i) => acc | (b << i), 0);
        this.byteBuffer = [];
        this.ignoreNextSlot = true;
        this.decodeCommand(byte);
    }

    private decodeCommand(byte: number): void {
        if (this.owState === 'RESET') {
            if (byte === 0xCC) this.owState = 'FUNCTION_CMD';
            else if (byte === 0x33) { this.owState = 'DATA'; this.readBuffer = [...this.rom()]; this.readBitIndex = 0; }
            else if (byte === 0x55) { this.owState = 'ROM_MATCH'; this.romMatchCount = 0; this.romMatchValid = true; }
            else if (byte === 0xF0) { this.owState = 'SEARCH_ROM'; this.searchBitIndex = 0; this.searchSlotStep = 0; }
            else this.owState = 'ROM_CMD';
        } else if (this.owState === 'ROM_MATCH') {
            if (byte !== (this.rom()[this.romMatchCount] ?? 0)) this.romMatchValid = false;
            this.romMatchCount++;
            if (this.romMatchCount >= 8) this.owState = this.romMatchValid ? 'FUNCTION_CMD' : 'IDLE';
        } else if (this.owState === 'FUNCTION_CMD') {
            if (byte === 0x44) {
                this.events.onConvertTemperature?.();
                this.owState = 'DATA';
                this.readBuffer = [0xFF];
                this.readBitIndex = 0;
            } else if (byte === 0xBE) {
                this.scratchpad = [...(this.events.onReadScratchpad?.() ?? [])];
                this.owState = 'DATA';
                this.readBuffer = [...this.scratchpad];
                this.readBitIndex = 0;
            } else {
                this.owState = 'DATA';
                this.readBuffer = [...this.scratchpad];
                this.readBitIndex = 0;
            }
        }
    }

    /**
     * Timeslot poll: returns the response bit the device should drive
     * (0 = pull LOW, 1 = release). Mirrors OneWireProtocol.onOneWireSlot.
     */
    pollSlot(): 0 | 1 {
        if (this.ignoreNextSlot) { this.ignoreNextSlot = false; return 1; }
        if (this.owState === 'SEARCH_ROM') {
            if (this.searchSlotStep === 3) { this.searchSlotStep = 0; return 1; }
            const romAddr = this.rom();
            const romBit = (romAddr[Math.floor(this.searchBitIndex / 8)] >> (this.searchBitIndex % 8)) & 1;
            let outBit = 1;
            if (this.searchSlotStep === 0) { outBit = romBit; this.searchSlotStep = 1; }
            else if (this.searchSlotStep === 1) { outBit = romBit ? 0 : 1; this.searchSlotStep = 2; }
            else return 1;
            return (outBit === 0 ? 0 : 1) as 0 | 1;
        }
        if (this.owState === 'DATA') {
            const buffer = this.readBuffer.length > 0 ? this.readBuffer : this.scratchpad;
            const byteIndex = Math.floor(this.readBitIndex / 8);
            const bitOffset = this.readBitIndex % 8;
            let outBit = 1;
            if (byteIndex < buffer.length) outBit = (buffer[byteIndex] >> bitOffset) & 1;
            this.readBitIndex++;
            return (outBit === 0 ? 0 : 1) as 0 | 1;
        }
        return 1;
    }

    setScratchpad(data: number[]): void { this.scratchpad = [...data]; }
    get state(): string { return this.owState; }
}
