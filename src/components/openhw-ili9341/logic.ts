import type { BaseComponent } from '../BaseComponent';
import { WasmComponent } from '../WasmComponent';
import { SpiBusFramer } from '../../protocol-handlers/index';
import { ili9341GlueLoader } from './glue';

// §12.4 WASM-heavy layout: `extends WasmComponent` DIRECTLY + an owned
// SpiBusFramer for pure CS/frame bookkeeping. WASM owns COMPUTE
// (descriptor pacing + pixel kernels); TS owns bus event decode
// (CASET/PASET/RAMWR framing), state, validate, uiState.
// update() = WasmComponent WASM-first dispatch; fallbackUpdate() = the
// REQUIRED slow-but-correct JS reference (runs when no core loaded).
//
// Why not `extends SPIProtocol`: that would stack TWO dispatch owners —
// the protocol base (CS/frame engine, its own _frame/_csActive) AND the
// WASM adapter (guarded onPin/onSPI routing) — over the same runner
// events. Bytes/state get double-counted and CS edges can run the core
// and the JS reference on the same tick. Composition (framer as a field)
// gives exactly ONE owner per event. See SpiBusFramer docs.
export class ILI9341Logic extends WasmComponent {
    private currentCommand = 0;

    // Windowing 
    private colStart = 0;
    private colEnd = 239;
    private rowStart = 0;
    private rowEnd = 319;
    private currentX = 0;
    private currentY = 0;

    // Private parameter buffering
    private params: number[] = [];

    // 16-bit color buffering
    private secondByte = false;
    private firstByteValue = 0;

    // FULL VRAM BUFFER (240 * 320 * 3 bytes for RGB)
    private vram = new Uint8Array(typeof SharedArrayBuffer !== 'undefined' ? new SharedArrayBuffer(240 * 320 * 3) : 240 * 320 * 3);
    private vramDirty = false;
    private lastSync = 0;
    private lastSyncCycles = 0; // cycle-based throttle (no Date.now in tick)
    private powerOn = true;
    private writeCount = 0;
    private madctl = 0x48;
    private vccDetected = true;
    private powerOffCountdown = 0;
    // WASM batch ingress: raw SPI data bytes accumulate here while a RAMWR
    // frame is open; flushed to the core in ONE crossing on CS deassert
    // (idle-gated: no per-byte boundary cost, zero overhead when idle).
    private ramwrPending: number[] | null = null;

    // Compact snapshot settings
    private compactPrefixBytes = 64;

    // Owned SPI framer (composition, NOT inheritance): pure CS/frame
    // bookkeeping. Runner bytes enter via onSPIByte() below — exactly once.
    private spi = new SpiBusFramer('CS', true, {
        onByte: (byte, index) => this.spiByteIn(byte, index),
        onAssert: () => this.spiAssert(),
        onDeassert: (meta) => this.spiDeassert(meta),
    });

    constructor(id: string, manifest: any) {
        super(id, manifest);
        // §12.4: attach the WASM loader; WasmComponent owns core/ready/load.
        this.setGlueLoader(ili9341GlueLoader as any);
        this.powerOn = true;
        this.vccDetected = true;
        this.state = {
            ...this.state,
            buffer: this.vram, powerOn: true, t: 0,
            spiFrames: [], compactSnapshot: null,
            spiRxBytes: 0, spiTxBytes: 0, csActive: false,
            lastCommand: null, lastFrame: [], lastResponse: [],
        };
    }

    // ── Runner entry points (SINGLE dispatch owner) ────────────────
    // The runner calls these; the framer only tracks CS/frame edges.

    /** Every SPI clock byte exchange. Returns the MISO byte (TFT: 0xFF). */
    onSPIByte(data: number): number {
        const byte = data & 0xFF;
        this.state.spiRxBytes = (this.state.spiRxBytes || 0) + 1;
        this.stateChanged = true;
        const miso = this.spi.pushByte(byte);
        this.state.spiTxBytes = (this.state.spiTxBytes || 0) + 1;
        return miso & 0xFF;
    }

    /** CS + RESET pin edges. CS routes to the framer; RESET stays local. */
    onPinStateChange(pinId: string, isHigh: boolean, cycles: number) {
        // WASM bus hooks stay OFF for the TFT (JS framing authoritative).
        super.onPinStateChange(pinId, isHigh, cycles);
        if (pinId === 'CS') {
            const wasActive = this.spi.csActive;
            this.spi.pushPin(pinId, isHigh);
            this.state.csActive = this.spi.csActive;
            this.stateChanged = true;
            void wasActive;
            return;
        }
        if (pinId === 'RESET' && !isHigh) {
            this.vram.fill(0);
            this.vramDirty = true;
            this.markCoreDirty(true);
        }
    }

    // ── Framer event handlers (private; the ONLY consumers of SPI bytes) ──

    private spiByteIn(byte: number, byteIndex: number): number | void {
        this.onSPIByteReceived(byte, byteIndex);
    }

    private spiAssert(): void {
        this.onCSAssert();
    }

    private spiDeassert(meta: { command: number; payload: number[]; frame: number[]; csPin: string }): void {
        if (meta.frame.length > 0) {
            this.state.lastCommand = meta.command;
            this.state.lastFrame = meta.frame;
        }
        this.onCSDeassert(meta);
    }

    /**
     * Idle gate (§12.4): skip the WASM boundary when the core has no work
     * (no dirty VRAM, heartbeat not due) — zero overhead when idle.
     */
    protected shouldRunWasmUpdate(cpuCycles: number): boolean {
        const nowMs = Math.floor(cpuCycles / 16000);
        return (this.vramDirty && (nowMs - this.lastSync > 33))
            || (nowMs - this.lastSync > 100)
            || this.vramDirty;
    }

    // CRC32 helper for compact snapshot
    private static crcTable: number[] | null = null;
    private static makeCRCTable(): number[] {
        const table: number[] = [];
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) {
                c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
            }
            table[n] = c >>> 0;
        }
        return table;
    }
    private static crc32(buf: Uint8Array): number {
        if (!ILI9341Logic.crcTable) ILI9341Logic.crcTable = ILI9341Logic.makeCRCTable();
        let crc = 0xFFFFFFFF;
        const table = ILI9341Logic.crcTable;
        for (let i = 0; i < buf.length; i++) {
            crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    private get dcHigh(): boolean {
        return this.getPinVoltage('DC') > 2.5;
    }

    /**
     * REQUIRED JS reference (§12.4): full model — power sensing, 30 FPS /
     * 100 ms sync gate, DMA blit. Runs when no WASM core is loaded AND as
     * afterWasmUpdate() housekeeping on the WASM path (via shared helper
     * below so both paths execute IDENTICAL logic — no drift).
     */
    protected fallbackUpdate(cpuCycles: number, currentWires: any[], instances: BaseComponent[]): void {
        this.jsSyncAndPower(cpuCycles, currentWires, instances);
    }

    /**
     * Post-core housekeeping on the WASM path: pull descriptor views, then
     * run the SAME sync/power/DMA helper as the JS reference.
     */
    protected afterWasmUpdate(cpuCycles: number, currentWires: any[], instances: BaseComponent[]): void {
        this.pullWasmDescriptorState();
        this.jsSyncAndPower(cpuCycles, currentWires, instances);
    }

    private jsSyncAndPower(cpuCycles: number, currentWires: any[], instances: BaseComponent[]): void {
        const nowMs = Math.floor(cpuCycles / 16000); // 16MHz: cycles->ms, no wall clock

        // Power Sensing: Check if VCC pin is wired to a power source or explicitly powered
        const vcc = this.getPinVoltage('VCC');
        const vccIsHigh = vcc > 2.0;
        
        // Check if VCC is connected to a power rail via wiring
        const hasWires = currentWires.length > 0;
        const vccConnected = currentWires.some(w => 
            (w.from === `${this.id}:VCC` || w.to === `${this.id}:VCC`) &&
            (w.from?.includes('5V') || w.from?.includes('3V3') || w.from?.includes('VIN') || w.from?.includes('VBUS') ||
             w.to?.includes('5V') || w.to?.includes('3V3') || w.to?.includes('VIN') || w.to?.includes('VBUS'))
        );

        // Power state machine: 
        // - If VCC is high or connected to power rail, stay powered
        // - Only power off if we see explicit low voltage AND stay low for multiple frames
        if (vccIsHigh || vccConnected || !hasWires) {
            this.vccDetected = true;
            this.powerOffCountdown = 0;
        } else {
            this.powerOffCountdown++;
        }

        // Require 10 consecutive frames of low/no VCC before powering off (debounce)
        const newPower = this.vccDetected && (this.powerOffCountdown < 10);

        if (newPower !== this.powerOn) {
            this.powerOn = newPower;
            this.state.powerOn = newPower;
            this.stateChanged = true;
            if (!this.powerOn) {
                this.vram.fill(0);
                this.vramDirty = true;
            }
        }

        // Periodic Sync (10Hz heartbeat + dirty flag for immediate response)
        // We sync if dirty (capped at ~30 FPS / 33ms to prevent telemetry flood) OR at least every 100ms
        if ((this.vramDirty && (nowMs - this.lastSync > 33)) || (nowMs - this.lastSync > 100)) {
            this.lastSync = nowMs;
            this.lastSyncCycles = cpuCycles;
            this.vramDirty = false;
            this.stateChanged = true;
        }

        // DMA Bypass Optimization for Displays
        const dmaAddress = parseInt((this as any).attrs?.dmaAddress || this.state?.dmaAddress || '0', 16);
        
        const hasLogicAnalyzer = this.isLogicAnalyzerAttached(instances);
        if (hasLogicAnalyzer) {
            this.state.dmaBypassDisabled = true;
            return; // Skip DMA polling and fallback to bit-banging
        }
        
        if (dmaAddress > 0 && this.powerOn) {
            const runner = (this as any)._runner;
            if (runner && runner.readDirectMemory && runner.getSimulatedTimeMs) {
                const nowMs = runner.getSimulatedTimeMs();
                // Polling at 60Hz
                if (!this.lastSync || (nowMs - this.lastSync) > 16) {
                    this.lastSync = nowMs;
                    // VRAM is 240 * 320 * 2 = 153,600 bytes (RGB565).
                    // Wait, our internal vram is 240*320*3 (RGB888) = 230,400 bytes.
                    // The DMA buffer in RP2040 is RGB565.
                    const dmaData = runner.readDirectMemory(dmaAddress, 240 * 320 * 2);
                    if (dmaData) {
                        // WASM fast path: ONE crossing for the whole 153600 B
                        // frame (kernel converts + bulk-copies into VRAM).
                        // Falls back to the JS loop below when the core is
                        // absent or rejects the frame (returns 0).
                        let converted = 0;
                        if (this.core?.dmaBlit) {
                            try {
                                const bytes = dmaData instanceof Uint8Array
                                    ? dmaData
                                    : new Uint8Array(dmaData.buffer ?? dmaData);
                                converted = this.core.dmaBlit(bytes, this.vram) || 0;
                            } catch { converted = 0; }
                        }
                        if (converted > 0) {
                            this.writeCount += converted;
                            this.vramDirty = true;
                            this.stateChanged = true;
                        } else {
                            for (let i = 0; i < 240 * 320; i++) {
                                const dmaIdx = i * 2;
                                // MSB first usually for ILI9341 SPI
                                const high = dmaData[dmaIdx];
                                const low = dmaData[dmaIdx + 1];
                                const full = (high << 8) | low;

                                const r = ((full >> 11) & 0x1f) << 3;
                                const g = ((full >> 5) & 0x3f) << 2;
                                const b = (full & 0x1f) << 3;

                                const idx = i * 3;
                                this.vram[idx] = r;
                                this.vram[idx + 1] = g;
                                this.vram[idx + 2] = b;
                            }
                            this.vramDirty = false; // We already processed it
                            this.stateChanged = true;
                        }
                    }
                }
            }
        }
    }

    /** Notify the WASM pacing core of a VRAM/power event (event path only). */
    private markCoreDirty(powerOn: boolean): void {
        if (!this.core) return;
        try {
            this.core.markDirty?.(powerOn ? 1 : 0);
        } catch { /* core stays stale; JS reference wins */ }
    }

    /**
     * Mirror WASM descriptor views into JS state (dirty-gated).
     * View layout (see glue.ts readStateViews): f[0]=syncCount,
     * i[0]=powerOn, i[1]=dirty.
     */
    protected pullWasmDescriptorState(): void {
        const core = this.core;
        if (!core) return;
        let views: { f: Float32Array; i: Int32Array } | null = null;
        try {
            views = core.readStateViews();
        } catch {
            return;
        }
        if (!views) return;
        const powerOn = views.i.length > 0 ? views.i[0] !== 0 : this.powerOn;
        if (powerOn !== this.powerOn) {
            this.powerOn = powerOn;
            this.state.powerOn = powerOn;
            this.stateChanged = true;
            if (!this.powerOn) {
                this.vram.fill(0);
                this.vramDirty = true;
            }
        }
    }
    
    /**
     * @deprecated Kept public for backward-compat. Runner path is
     * onPinStateChange(CS) → framer → here. New code must NOT call this.
     */
    onCSAssert(): void {
        this.params = [];
        this.secondByte = false;
        // Open a fresh RAMWR batch (flushed in ONE crossing on deassert).
        this.ramwrPending = null;
    }

    /** @deprecated Same as onCSAssert — use the framer path. */
    onCSDeassert(meta: any): void {
        // Flush the batched RAMWR stream: ONE crossing for the whole frame.
        this.flushRamwrBatch();
        // Record recent SPI frames for telemetry/debugging (bounded)
        try {
            const frame = meta?.frame || [];
            if (frame && frame.length > 0) {
                const max = 8;
                const buf = (this.state.spiFrames as any[]) || [];
                buf.push({ t: 0, frame });
                while (buf.length > max) buf.shift();
                this.state.spiFrames = buf;
                this.state.spiTrafficCount = (this.state.spiTrafficCount || 0) + 1;
                this.stateChanged = true;
            }
        } catch (e) {
            // swallow telemetry errors
        }
    }

    /**
     * Flush accumulated RAMWR data bytes to the WASM kernel in ONE crossing.
     * Falls back to the per-pixel JS reference when the core is absent or
     * rejects the batch. Odd trailing byte stays in secondByte/firstByteValue
     * (same contract as the streaming path).
     */
    private flushRamwrBatch(): void {
        const pending = this.ramwrPending;
        this.ramwrPending = null;
        if (!pending || pending.length === 0) return;
        // Prepend any held odd byte so pairs stay aligned.
        let bytes: Uint8Array;
        if (this.secondByte) {
            bytes = new Uint8Array(pending.length + 1);
            bytes[0] = this.firstByteValue;
            bytes.set(pending, 1);
            this.secondByte = false;
        } else {
            bytes = new Uint8Array(pending);
        }
        // Whole-pair prefix goes to the kernel; odd tail stays held.
        const evenLen = bytes.length - (bytes.length % 2);
        if (evenLen < 2) {
            if (bytes.length > 0) {
                this.firstByteValue = bytes[0];
                this.secondByte = true;
            }
            return;
        }
        const tail = bytes.length - evenLen;
        let written = 0;
        if (this.core?.ramwrBlit) {
            try {
                written = this.core.ramwrBlit(bytes.subarray(0, evenLen), this.vram) || 0;
            } catch { written = 0; }
        }
        if (written > 0) {
            // Kernel advanced its own cursor — mirror it so the JS fallback
            // stays in lockstep if the core ever drops out mid-frame.
            this.syncCursorFromCore();
            this.writeCount += written;
            this.vramDirty = true;
            this.markCoreDirty(this.powerOn);
        } else {
            // JS reference: identical math to the streaming handleDataByte.
            for (let k = 0; k < evenLen; k += 2) {
                this.writePixelPair(bytes[k], bytes[k + 1]);
            }
        }
        if (tail > 0) {
            this.firstByteValue = bytes[evenLen];
            this.secondByte = true;
        }
    }

    /** Best-effort cursor mirror (core → JS) after a kernel blit. */
    private syncCursorFromCore(): void {
        try {
            const q = this.core?.ramwrCursor?.();
            if (q && Number.isFinite(Number(q.x)) && Number.isFinite(Number(q.y))) {
                this.currentX = Number(q.x);
                this.currentY = Number(q.y);
            }
        } catch { /* JS cursor stays authoritative */ }
    }

    /**
     * @deprecated Kept public for backward-compat (tests/tools call it
     * directly). The runner path is onSPIByte() → framer → here. New code
     * must NOT call this; use onSPIByte().
     */
    onSPIByteReceived(byte: number, byteIndex: number): void {
        const dmaAddress = parseInt((this as any).attrs?.dmaAddress || this.state?.dmaAddress || '0', 16);
        if (dmaAddress > 0 && !this.state.dmaBypassDisabled) return; // Bypass normal SPI processing if DMA active

        if (!this.powerOn) {
            console.warn(`[ILI9341Logic] onSPIByteReceived ignored because powerOn is false! VCC voltage=${this.getPinVoltage('VCC')}`);
            return;
        }

        const isDC = this.dcHigh;


        if (!isDC) {
            // A new command closes any open RAMWR batch first.
            this.flushRamwrBatch();
            this.currentCommand = byte;
            this.params = [];
            this.secondByte = false;
            if (byte === 0x2C) { // RAMWR
                this.currentX = this.colStart;
                this.currentY = this.rowStart;
                try { this.core?.ramwrBegin?.(); } catch { /* ignore */ }
            }
        } else {
            this.handleDataByte(byte);
        }
    }

    /** Single RGB565 pair → VRAM (shared by streaming + batch fallback). */
    private writePixelPair(hi: number, lo: number): void {
        const full = ((hi & 0xff) << 8) | (lo & 0xff);
        const r = ((full >> 11) & 0x1f) << 3;
        const g = ((full >> 5) & 0x3f) << 2;
        const b = (full & 0x1f) << 3;

        const mv = (this.madctl >> 5) & 1;
        const mx = (this.madctl >> 6) & 1;
        const my = (this.madctl >> 7) & 1;

        let physX = 0;
        let physY = 0;

        if (mv === 0) {
            // Portrait
            physX = mx ? this.currentX : (239 - this.currentX);
            physY = my ? (319 - this.currentY) : this.currentY;
        } else {
            // Landscape
            physX = mx ? (239 - this.currentY) : this.currentY;
            physY = my ? this.currentX : (319 - this.currentX);
        }

        if (physX >= 0 && physX < 240 && physY >= 0 && physY < 320) {
            const idx = (physY * 240 + physX) * 3;
            this.vram[idx] = r;
            this.vram[idx + 1] = g;
            this.vram[idx + 2] = b;
            this.vramDirty = true;
            this.writeCount += 1;
            this.markCoreDirty(this.powerOn);
        }

        this.currentX++;
        if (this.currentX > this.colEnd) {
            this.currentX = this.colStart;
            this.currentY++;
            if (this.currentY > this.rowEnd) {
                this.currentY = this.rowStart;
            }
        }
    }

    private handleDataByte(data: number) {
        switch (this.currentCommand) {
            case 0x2A: // CASET
                this.params.push(data);
                if (this.params.length === 4) {
                    this.colStart = (this.params[0] << 8) | this.params[1];
                    this.colEnd = (this.params[2] << 8) | this.params[3];
                    this.currentX = this.colStart;
                    this.pushWindowToCore();
                }
                break;

            case 0x2B: // PASET
                this.params.push(data);
                if (this.params.length === 4) {
                    this.rowStart = (this.params[0] << 8) | this.params[1];
                    this.rowEnd = (this.params[2] << 8) | this.params[3];
                    this.currentY = this.rowStart;
                    this.pushWindowToCore();
                }
                break;

            case 0x36: // MADCTL
                this.params.push(data);
                if (this.params.length === 1) {
                    this.madctl = this.params[0] & 0xff;
                    this.pushWindowToCore();
                }
                break;

            case 0x2C: // RAMWR - RGB565 (batched; flushed on CS deassert)
                if (this.core?.ramwrBlit) {
                    if (!this.ramwrPending) this.ramwrPending = [];
                    this.ramwrPending.push(data & 0xff);
                    // Bound the batch (8 KB ≈ 4k pixels); flush early on
                    // overflow so memory stays flat on huge fills.
                    if (this.ramwrPending.length >= 8192) this.flushRamwrBatch();
                } else if (!this.secondByte) {
                    this.firstByteValue = data;
                    this.secondByte = true;
                } else {
                    this.secondByte = false;
                    this.writePixelPair(this.firstByteValue, data);
                }
                break;
        }
    }

    /** Mirror CASET/PASET/MADCTL window into the core (command path only). */
    private pushWindowToCore(): void {
        if (!this.core?.setWindow) return;
        try {
            this.core.setWindow(
                this.colStart, this.colEnd, this.rowStart, this.rowEnd, this.madctl);
        } catch { /* core window stays stale; JS wins */ }
    }

    getSyncState() {
        return {
            buffer: this.vram,
            powerOn: this.powerOn,
            t: 0
        };
    }

    onCustomTelemetry() {
        // Telemetry is OFF the tick path (emitted on flush only), so the
        // WASM helpers below are a latency win, not a boundary cost: they
        // replace a 76.8k-iteration JS scan with one kernel call each.
        let fillPercent: number;
        const wasmFill = (this.core?.fillPercentX10)
            ? (() => { try { return this.core!.fillPercentX10!(); } catch { return 0; } })()
            : 0;
        if (wasmFill > 0) {
            fillPercent = Number((wasmFill / 10).toFixed(1));
        } else {
            let activeCount = 0;
            // sampling every 3 bytes (RGB)
            for (let i = 0; i < this.vram.length; i += 3) {
                if (this.vram[i] > 0 || this.vram[i + 1] > 0 || this.vram[i + 2] > 0) activeCount++;
            }
            const total = 240 * 320;
            fillPercent = (activeCount / total) * 100;
        }
        const orientation = (this.madctl & 0x20) !== 0 ? 'landscape' : 'portrait';
        this.setCustomTelemetry({
            powerStatus: this.powerOn ? "On" : "Off",
            resolution: "240x320",
            orientation,
            writeCount: this.writeCount,
            vramFillPercentage: Number(fillPercent.toFixed(1)),
        });

        // Also publish a compact snapshot to state for lightweight telemetry
        try {
            const prefix = Math.min(this.compactPrefixBytes, this.vram.length);
            const firstBytes = new Uint8Array(prefix);
            for (let i = 0; i < prefix; i++) firstBytes[i] = this.vram[i];
            let checksum: number;
            if (this.core?.crc32Of) {
                try { checksum = this.core.crc32Of(firstBytes) >>> 0; }
                catch { checksum = ILI9341Logic.crc32(firstBytes); }
            } else {
                checksum = ILI9341Logic.crc32(firstBytes);
            }
            this.state.compactSnapshot = {
                firstBytes: Array.from(firstBytes),
                checksum,
                vramFillPercentage: Number(fillPercent.toFixed(1)),
                writeCount: this.writeCount,
                width: 240,
                height: 320
            };
            this.stateChanged = true;
        } catch (e) {
            // ignore telemetry failures
        }
    }

    // 12.4 v2: numeric UI state for SAB slot {i0: powerOn} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {},
            i: {powerOn: (s.powerOn ? 1 : 0)},
        };
    }
    validate(component: any, graph: Map<string, string[]>, validator?: any) {
        const vccVolt = validator?.calculateVoltageAtNode(`${component.id}.VCC`);
        const gndVolt = validator?.calculateVoltageAtNode(`${component.id}.GND`);

        if (vccVolt !== undefined && vccVolt < 3.0) {
            return { severity: 'warn', message: `${component.label || 'ILI9341'} requires at least 3.3V on VCC` };
        }
        if (gndVolt !== undefined && gndVolt > 0.5) {
            return { severity: 'error', message: `${component.label || 'ILI9341'} has missing or poor ground connection` };
        }
        return null;
    }
}
