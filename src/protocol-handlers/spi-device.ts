import { BaseComponent } from '../components/BaseComponent';

// ─────────────────────────────────────────────────────────────────────────────
// SPI Protocol — Advanced Base Class
//
// Supports every common SPI device pattern:
//
//  1. Write-only (displays like ILI9341, Nokia 5110, MAX7219)
//     → Override onSPIByteReceived(byte, index) or onSPITransactionEnd(frame)
//
//  2. Full-duplex (sensors / radio: MFRC522, nRF24, CC1101)
//     → Override onSPIByteExchange(byte, index) to return the MISO byte
//
//  3. Register-map devices (nRF24, CC1101, MCP3208)
//     → Use the built-in register map helpers:
//          setRegister(reg, value)
//          getRegister(reg): number
//          onSPIRegisterWrite(reg, data[])  — called when master writes
//          onSPIRegisterRead(reg, count)    — return bytes for master to read
//
//  4. Command / response devices (SD card, radio chips, ADCs)
//     → Override onSPICommand(command, payload[]) → number[]
//       Return bytes are queued on MISO for the next bytes of the transaction.
//
// Active CS polarity is configurable for SPI devices that use Active-HIGH CS
// (rare, but some displays/GPIOs use it). Default is Active-LOW.
// ─────────────────────────────────────────────────────────────────────────────

export interface SPITransactionMeta {
    command: number;
    payload: number[];
    frame: number[];
    csPin: string;
}

export class SPIProtocol extends BaseComponent {
    // NOTE (§12.4): this class is the PURE-TS bus layer (frame/MISO/CS
    // engine). It deliberately does NOT extend WasmComponent: every one of
    // the ~16 SPI components must keep working with zero WASM involvement.
    // WASM-heavy components compose instead — `class XLogic extends
    // WasmComponent` + `private spi = new SpiBusFramer(...)` (see below) —
    // so the bus is a helper, never a base class, and onPin/onSPI routing
    // can never double-fire through a protocol inheritance chain.
    // ── Configuration overrides ───────────────────────────────────────────────

    /** Return false to use Active-HIGH CS (default: Active-LOW). */
    get csActivelow(): boolean { return true; }

    /** Override to return which CS pin name to monitor (default: autodetect). */
    getCSPinName(): string {
        const pins = Object.keys(this.manifest?.pins || {});
        for (const p of pins) {
            const u = p.toUpperCase();
            if (['CS', 'CE', 'SS', 'SSEL', 'NSS', 'CS_N', 'NCE', 'SDA', 'NCS'].includes(u)) return p;
        }
        return 'CS';
    }

    // ── Internal state ────────────────────────────────────────────────────────
    private _frame: number[] = [];
    private _misoQueue: number[] = [];
    private _csActive = false;
    private _registers: Map<number, number> = new Map();

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = {
            ...this.state,
            spiRxBytes: 0,
            spiTxBytes: 0,
            csActive: false,
            lastCommand: null,
            lastFrame: [],
            lastResponse: [],
        };
    }

    // ── Register map helpers (for nRF24, CC1101, MCP3208, etc.) ──────────────

    /** Read a simulated register value. Returns 0xFF if not set. */
    protected getRegister(reg: number): number {
        return this._registers.get(reg) ?? 0xFF;
    }

    /** Write a simulated register value. */
    protected setRegister(reg: number, value: number): void {
        this._registers.set(reg, value & 0xFF);
    }

    /** Bulk-initialise registers (call in constructor). */
    protected initRegisters(defaults: Record<number, number>): void {
        for (const [reg, val] of Object.entries(defaults)) {
            this._registers.set(Number(reg), val & 0xFF);
        }
    }

    // ── Hooks — override in subclasses ────────────────────────────────────────

    /** Called immediately when CS is asserted (LOW for active-low devices). */
    onCSAssert(): void {}

    /**
     * Called immediately when CS is deasserted.
     * Full frame is available in `meta.frame`.
     */
    onCSDeassert(meta: SPITransactionMeta): void {}

    /**
     * Full-frame hook: called when CS deasserts.
     * First byte is the command/address byte. Rest is payload.
     * Return MISO bytes to queue for subsequent reads.
     * Prefer this over onSPIByteExchange for register-map devices.
     */
    onSPICommand(command: number, payload: number[]): number[] {
        return [];
    }

    /**
     * Byte-by-byte hook: called for EACH byte during an active CS window.
     * Return the MISO byte for that clock cycle.
     * Use this for devices that need to respond within the same transaction.
     */
    onSPIByteExchange(byte: number, byteIndex: number): number {
        return this._misoQueue.length > 0 ? this._misoQueue.shift()! : 0xFF;
    }

    /**
     * Register-write hook: called after a full write transaction is decoded.
     * Convenience alternative to onSPICommand for register-map devices.
     * @param reg    Register address
     * @param data   Data bytes written (may be empty for single-byte commands)
     */
    onSPIRegisterWrite(reg: number, data: number[]): void {}

    /**
     * Register-read hook: called when the decoded command indicates a read.
     * Return the bytes the master will receive.
     * For nRF24/CC1101 style: bit 6 of the command byte is the R/W flag.
     * @param reg   Register address (command byte with R/W bit cleared)
     * @param count Number of bytes the master expects to read
     */
    onSPIRegisterRead(reg: number, count: number): number[] {
        // Default: return register map values
        const result: number[] = [];
        for (let i = 0; i < count; i++) {
            result.push(this.getRegister(reg + i));
        }
        return result;
    }

    /** Called for every received byte (write-only devices like displays). */
    onSPIByteReceived(byte: number, byteIndex: number): void {}

    /** Called at CS deassert with the complete frame (useful for displays). */
    onSPITransactionEnd(frame: number[]): void {}

    // ── SPI engine hooks (called by runner) ───────────────────────────────────

    /** Called by the runner for every SPI clock byte exchange. */
    onSPIByte(data: number): number {
        const byte = data & 0xFF;
        this.state.spiRxBytes = (this.state.spiRxBytes || 0) + 1;
        this.stateChanged = true;

        this._frame.push(byte);
        this.onSPIByteReceived(byte, this._frame.length - 1);

        const miso = this.onSPIByteExchange(byte, this._frame.length - 1);
        this.state.spiTxBytes = (this.state.spiTxBytes || 0) + 1;
        return miso & 0xFF;
    }

    /** Called by the runner when the CS pin changes. */
    onPinStateChange(pinId: string, isHigh: boolean, cycles: number): void {
        super.onPinStateChange(pinId, isHigh, cycles);

        if (pinId !== this.getCSPinName()) return;

        // Determine if CS just became active or inactive
        const nowActive = this.csActivelow ? !isHigh : isHigh;

        if (nowActive && !this._csActive) {
            // CS asserted
            this._csActive = true;
            this._frame = [];
            this._misoQueue = [];
            this.state.csActive = true;
            this.stateChanged = true;
            this.onCSAssert();

        } else if (!nowActive && this._csActive) {
            // CS deasserted — process the completed frame
            this._csActive = false;
            this.state.csActive = false;
            this.stateChanged = true;

            const frame = [...this._frame];
            if (frame.length > 0) {
                const command = frame[0];
                const payload = frame.slice(1);

                this.recordSpiTransaction(frame);

                if (frame.length <= 32) {
                    try {
                        console.log(`[SPI] ${this.id} CS deassert frame=${frame.length} cmd=0x${command.toString(16).padStart(2, '0')} bytes=[${frame.map(b => `0x${(b & 0xff).toString(16).padStart(2, '0')}`).join(', ')}]`);
                    } catch {
                        // keep telemetry path silent if console formatting fails
                    }
                } else {
                    try {
                        console.log(`[SPI] ${this.id} CS deassert frame=${frame.length} cmd=0x${command.toString(16).padStart(2, '0')} preview=[${frame.slice(0, 16).map(b => `0x${(b & 0xff).toString(16).padStart(2, '0')}`).join(', ')} ...]`);
                    } catch {
                        // keep telemetry path silent if console formatting fails
                    }
                }

                this.state.lastCommand = command;
                this.state.lastFrame = frame;

                // Call high-level hook
                const response = this.onSPICommand(command, payload) || [];
                this.state.lastResponse = response;

                // Queue MISO bytes for next transaction
                if (response.length > 0) {
                    this._misoQueue.push(...response);
                    this.state._queuedMiso = [...response];
                }

                this.onSPITransactionEnd(frame);
            }

            const meta: SPITransactionMeta = {
                command: frame[0] ?? 0,
                payload: frame.slice(1),
                frame,
                csPin: pinId,
            };
            this.onCSDeassert(meta);
        }
    }

    /** Whether CS is currently asserted. */
    get csActive(): boolean { return this._csActive; }

    /** Current accumulated frame bytes (during an active CS window). */
    get currentFrame(): number[] { return [...this._frame]; }

    /** Queue bytes to be returned on MISO during upcoming exchange. */
    protected queueMISOBytes(bytes: number[]): void {
        this._misoQueue.push(...bytes);
    }

    /** Clear the MISO queue (e.g. on reset or error). */
    protected clearMISOQueue(): void {
        this._misoQueue = [];
    }
}

/**
 * SpiBusFramer — composition helper for WASM-heavy components (§12.4).
 *
 * The problem with `class XLogic extends SPIProtocol extends WasmComponent`
 * is that two dispatch layers then own the same events (onPin/onSPIByte):
 * the runner calls the WASM-first override while the protocol engine also
 * drives CS/frame state, so bytes get counted twice and CS edges can run
 * the core AND the JS reference on the same tick.
 *
 * The fix: WASM-heavy components extend WasmComponent DIRECTLY and own a
 * SpiBusFramer for pure framing (CS detect, byte counting, frame buffer).
 * The framer has NO update()/WASM knowledge — it just reports events the
 * component routes explicitly (JS reference and/or core batch calls).
 */
export interface SpiFrameEvents {
    onByte?(byte: number, byteIndex: number): number | void;
    onAssert?(): void;
    onDeassert?(meta: SPITransactionMeta): void;
}

export class SpiBusFramer {
    private frame: number[] = [];
    private active = false;
    constructor(
        private readonly csPinName: string,
        private readonly activeLow: boolean,
        private readonly events: SpiFrameEvents,
    ) {}

    /** Feed one exchanged byte; returns the MISO byte (default 0xFF). */
    pushByte(data: number): number {
        const byte = data & 0xFF;
        this.frame.push(byte);
        const r = this.events.onByte?.(byte, this.frame.length - 1);
        return typeof r === 'number' ? (r & 0xFF) : 0xFF;
    }

    /** Feed a CS pin edge; default CS pin name + active-low polarity. */
    pushPin(pinId: string, isHigh: boolean): void {
        if (pinId !== this.csPinName) return;
        const nowActive = this.activeLow ? !isHigh : isHigh;
        if (nowActive && !this.active) {
            this.active = true;
            this.frame = [];
            this.events.onAssert?.();
        } else if (!nowActive && this.active) {
            this.active = false;
            const frame = [...this.frame];
            this.events.onDeassert?.({
                command: frame[0] ?? 0,
                payload: frame.slice(1),
                frame,
                csPin: pinId,
            });
        }
    }

    get csActive(): boolean { return this.active; }
    get currentFrame(): number[] { return [...this.frame]; }
}
