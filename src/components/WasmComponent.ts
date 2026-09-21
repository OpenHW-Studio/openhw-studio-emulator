// WasmComponent — dual-runtime adapter (§4.3, component v2).
//
// Runners keep calling `inst.update(...)` unchanged; this subclass routes the
// hot path into a WASM core when loaded, or into the JS reference fallback
// otherwise. Pin ids → u32 indexes once at create(); voltages → f32 SAB
// array; getSyncState returns the cached JS mirror refreshed only on dirty.
//
// Contract for glue.ts loaders (per component):
//   interface WasmCore {
//     readonly memory: ArrayBuffer | SharedArrayBuffer;
//     update(cycles: number): void;
//     onPin?(pinIdx: number, high: number, cycles: number): void;
//     onI2CByte?(addr: number, data: number): number;
//     onSPIByte?(data: number): number;
//     // ... one optional hook per protocol family (all default-absent;
//     // subclass opts in via useWasmBusHooks() + route*() helpers below).
//     onUARTByte?(data: number): void;
//     onPWM?(pinIdx: number, duty01: number, freqHz: number): void;
//     onOneWire?(kind: number, pinIdx: number, arg: number): number;
//     onI2SFrame?(channel: number, sample: number): void;
//     onPulse?(pinIdx: number, high: number, durationUs: number): void;
//     onTwoWire?(byte: number): void;
//     onDigitalEdge?(pinIdx: number, high: number, cycles: number): void;
//     onAnalog?(pinIdx: number, volts: number): void;
//     onNeoPixel?(count: number): void;
//     readStateViews(): { f: Float32Array; i: Int32Array } | null;
//     destroy?(): void;
//   }
// Strings NEVER cross the boundary in the hot path (see §5).
// Numeric enum encodings keep every crossing to plain numbers:
// onOneWire kind: 0=reset 1=writeBit 2=slot; onDigitalEdge high: 0/1.

import { BaseComponent } from './BaseComponent';

/** WASM ABI version both sides must agree on (manifest.wasm.abi vs worker). */
export const WASM_ABI_VERSION = 1;

export interface WasmCore {
    readonly memory: ArrayBuffer | SharedArrayBuffer;
    update(cycles: number): void;
    onPin?(pinIdx: number, high: number, cycles: number): void;
    onI2CByte?(addr: number, data: number): number;
    onSPIByte?(data: number): number;
    /** UART RX byte (framed by UartBusFramer; TX queue stays JS). */
    onUARTByte?(data: number): void;
    /** PWM signal (duty 0..1, freq Hz; pinIdx from buildPinIndex). */
    onPWM?(pinIdx: number, duty01: number, freqHz: number): void;
    /**
     * 1-Wire slot event. kind: 0=reset 1=writeBit(arg=bit) 2=slot.
     * Returns the response bit for kind 2 (DATA/SEARCH_ROM reads),
     * 0 otherwise ( reset/writeBit are fire-and-forget).
     */
    onOneWire?(kind: number, pinIdx: number, arg: number): number;
    /** I2S audio frame (channel 0=L/1=R, signed sample). */
    onI2SFrame?(channel: number, sample: number): void;
    /** Pulse-device completed pulse (duration in microseconds). */
    onPulse?(pinIdx: number, high: number, durationUs: number): void;
    /** TwoWire (TM1637-style) decoded byte, LSB-first already assembled. */
    onTwoWire?(byte: number): void;
    /** Debounced digital edge (DigitalProtocol.onPinEdge equivalent). */
    onDigitalEdge?(pinIdx: number, high: number, cycles: number): void;
    /** Analog threshold crossing (averaged volts). */
    onAnalog?(pinIdx: number, volts: number): void;
    /** NeoPixel frame ready (pixel buffer already in shared memory). */
    onNeoPixel?(count: number): void;
    /** Event-path dirty notify (display descriptor cores: mark_dirty). */
    markDirty?(flag: number): void;
    /**
     * Batched pixel/window fast paths (ILI9341 TFT). All optional; the JS
     * reference in logic.ts stays authoritative and runs when any of these
     * is absent or returns 0/falsy.
     * - setWindow/ramwrBegin mirror CASET/PASET/MADCTL/RAMWR framing.
     * - ramwrBlit/dmaBlit ingest whole byte streams in ONE crossing and
     *   bulk-copy the result into the SAB VRAM; return pixels written.
     * - fillPercentX10/crc32Of replace the full-VRAM telemetry scan.
     */
    setWindow?(cs: number, ce: number, rs: number, re: number, madctl: number): void;
    ramwrBegin?(): void;
    ramwrBlit?(bytes: Uint8Array, vram: Uint8Array): number;
    dmaBlit?(dma: Uint8Array, vram: Uint8Array): number;
    ramwrCursor?(): { x: number; y: number } | null;
    fillPercentX10?(): number;
    crc32Of?(prefix: Uint8Array): number;
    readStateViews(): { f: Float32Array; i: Int32Array } | null;
    destroy?(): void;
}

export interface WasmGlueLoader {
    load(manifest: any): Promise<WasmCore | null>;
}

export class WasmComponent extends BaseComponent {
    protected core: WasmCore | null = null;
    protected pinIndex = new Map<string, number>();
    protected wasmReady = false;
    private loader: WasmGlueLoader | null = null;
    private loadAttempted = false;
    private cachedMirror: Record<string, any> = {};

    /**
     * Legacy accessors (§12.4 migration): subclasses written before the
     * WasmComponent-subclass refactor use this.wasmCore/this.wasmReady.
     * Backed by the base fields — one source of truth, no duplication.
     */
    protected get wasmCore(): WasmCore | null { return this.core; }
    protected set wasmCore(c: WasmCore | null) {
        this.core = c;
        if (c) this.wasmReady = true;
    }

    /** Attach the component-specific glue loader (imported from ./glue). */
    protected setGlueLoader(loader: WasmGlueLoader | null): void {
        this.loader = loader;
    }

    /** Build pin-index map once (string ids → u32, hot-path free). */
    protected buildPinIndex(): void {
        this.pinIndex.clear();
        const pins = this.manifest?.pins || [];
        pins.forEach((p: any, idx: number) => {
            const id = typeof p === 'string' ? p : p?.id;
            if (id) this.pinIndex.set(String(id), idx);
        });
    }

    /** Lazy async load — called by runner after construction, never in tick. */
    async ensureWasmLoaded(): Promise<boolean> {
        if (this.wasmReady) return true;
        if (this.loadAttempted || !this.loader) return false;
        this.loadAttempted = true;
        try {
            this.buildPinIndex();
            const core = await this.loader.load(this.manifest);
            if (core) {
                this.core = core;
                this.wasmReady = true;
                return true;
            }
        } catch {
            // Fall through to JS fallback — simulation must never break.
        }
        this.core = null;
        this.wasmReady = false;
        return false;
    }

    /** JS reference fallback — subclasses MUST override (slow-but-correct). */
    protected fallbackUpdate(_cpuCycles: number, _wires: any[], _instances: BaseComponent[]): void {
        // Default: hold state. Real components implement the reference model.
    }

    /**
     * WASM-first dispatch: when a core is loaded, the CORE owns update()
     * (subclass may still run cheap JS housekeeping via afterWasmUpdate()
     * — e.g. descriptor pulls — but the per-tick model lives in WASM).
     * shouldRunWasmUpdate() lets idle components skip the boundary entirely
     * (zero overhead when idle — e.g. ILI9341 gates on dirty/heartbeat).
     * WASM-throw → self-heal to JS fallback, never break simulation.
     */
    update(cpuCycles: number, wires: any[], instances: BaseComponent[]): void {
        if (this.core && this.wasmReady) {
            let runWasm = true;
            try {
                runWasm = this.shouldRunWasmUpdate(cpuCycles, wires, instances);
            } catch {
                runWasm = true;
            }
            if (runWasm) {
                try {
                    this.core.update(cpuCycles);
                    this.pullWasmState();
                    this.afterWasmUpdate(cpuCycles, wires, instances);
                    return;
                } catch {
                    this.wasmReady = false;
                    this.core = null;
                }
            } else {
                // Idle-gated: core has no work — still run JS housekeeping
                // so power/sync/DMA mirrors stay live with zero crossings.
                try {
                    this.afterWasmUpdate(cpuCycles, wires, instances);
                } catch {
                    // housekeeping must never break the tick
                }
                return;
            }
        }
        this.fallbackUpdate(cpuCycles, wires, instances);
    }

    /**
     * Idle gate: return false to skip the WASM boundary on this tick.
     * Default true (core runs every tick; cheap cores gate internally).
     */
    protected shouldRunWasmUpdate(
        _cpuCycles: number, _wires: any[], _instances: BaseComponent[],
    ): boolean {
        return true;
    }

    /**
     * Post-core JS housekeeping (optional): cheap mirror/sync work that must
     * run even on the WASM path (e.g. ILI9341 DMA poll, SSD1306 frame emit).
     * Default: no-op. Must NEVER duplicate compute the core already did.
     */
    protected afterWasmUpdate(_cpuCycles: number, _wires: any[], _instances: BaseComponent[]): void {}

    /**
     * Guard: route to the core only when it implements the hook AND the
     * subclass opts in via useWasmBusHooks() (bus-heavy cores). Default
     * false → JS bus state machines stay authoritative (displays, SD).
     */
    protected useWasmBusHooks(): boolean { return false; }

    onPinStateChange(pinId: string, isHigh: boolean, cpuCycles: number): void {
        const idx = this.pinIndex.get(String(pinId));
        if (idx !== undefined) {
            const routed = this.callCore((c) =>
                typeof c.onPin === 'function' ? c.onPin(idx, isHigh ? 1 : 0, cpuCycles) : undefined);
            // A core that handles the pin owns the edge: skip the JS hook
            // (prevents double-driving). A core without on_pin (undefined)
            // falls through to JS — the common display/SD case.
            if (routed !== undefined) return;
        }
        super.onPinStateChange(pinId, isHigh, cpuCycles);
    }

    /** Resolve a pin id to its u32 index (built once at load). -1 = unknown. */
    protected pinToIndex(pinId: string): number {
        const idx = this.pinIndex.get(String(pinId));
        return idx === undefined ? -1 : idx;
    }

    /**
     * Guarded core call: runs fn only when a core is loaded AND the
     * subclass opted into WASM bus hooks. WASM-throw self-heals to JS
     * (wasmReady=false) and yields undefined — the caller then runs the
     * JS reference. Every route*() helper below funnels through this so
     * there is exactly ONE place where the boundary can fail.
     */
    protected callCore<T>(fn: (core: WasmCore) => T): T | undefined {
        if (!this.core || !this.wasmReady || !this.useWasmBusHooks()) return undefined;
        try {
            return fn(this.core);
        } catch {
            this.wasmReady = false;
            this.core = null;
            return undefined;
        }
    }

    /** I2C byte → core when the subclass opts into WASM bus hooks. */
    protected routeI2CByte(addr: number, data: number): number | null {
        const r = this.callCore((c) =>
            typeof c.onI2CByte === 'function' ? c.onI2CByte(addr & 0x7f, data & 0xff) : undefined);
        return typeof r === 'number' ? Number(r) : null;
    }

    /** SPI byte → core when the subclass opts into WASM bus hooks. */
    protected routeSPIByte(data: number): number | null {
        const r = this.callCore((c) =>
            typeof c.onSPIByte === 'function' ? c.onSPIByte(data & 0xff) : undefined);
        return typeof r === 'number' ? Number(r) : null;
    }

    /** UART RX byte → core (framed; TX queue stays JS). */
    protected routeUARTByte(data: number): void {
        this.callCore((c) => { c.onUARTByte?.(data & 0xff); });
    }

    /** PWM signal → core (pin id resolved once via pinIndex). */
    protected routePWM(pinId: string, duty01: number, freqHz: number): void {
        const idx = this.pinToIndex(pinId);
        if (idx < 0) return;
        this.callCore((c) => { c.onPWM?.(idx, duty01, freqHz); });
    }

    /**
     * 1-Wire slot event → core. kind: 0=reset 1=writeBit 2=slot.
     * Returns the response bit for kind 2, null otherwise.
     */
    protected routeOneWire(kind: 0 | 1 | 2, pinId: string, arg: number): number | null {
        const idx = this.pinToIndex(pinId);
        if (idx < 0) return null;
        const r = this.callCore((c) =>
            typeof c.onOneWire === 'function' ? c.onOneWire(kind, idx, arg) : undefined);
        return typeof r === 'number' ? Number(r) : null;
    }

    /** I2S audio frame → core (normalized sample already computed). */
    protected routeI2SFrame(channel: 0 | 1, sample: number): void {
        this.callCore((c) => { c.onI2SFrame?.(channel, sample); });
    }

    /** Completed pulse → core (duration already measured in µs). */
    protected routePulse(pinId: string, high: boolean, durationUs: number): void {
        const idx = this.pinToIndex(pinId);
        if (idx < 0) return;
        this.callCore((c) => { c.onPulse?.(idx, high ? 1 : 0, durationUs); });
    }

    /** TwoWire decoded byte → core. */
    protected routeTwoWire(byte: number): void {
        this.callCore((c) => { c.onTwoWire?.(byte & 0xff); });
    }

    /** Debounced digital edge → core. */
    protected routeDigitalEdge(pinId: string, high: boolean, cycles: number): void {
        const idx = this.pinToIndex(pinId);
        if (idx < 0) return;
        this.callCore((c) => { c.onDigitalEdge?.(idx, high ? 1 : 0, cycles >>> 0); });
    }

    /** Analog threshold crossing → core (averaged volts). */
    protected routeAnalog(pinId: string, volts: number): void {
        const idx = this.pinToIndex(pinId);
        if (idx < 0) return;
        this.callCore((c) => { c.onAnalog?.(idx, volts); });
    }

    /** NeoPixel frame ready → core (pixels already in shared memory). */
    protected routeNeoPixel(count: number): void {
        this.callCore((c) => { c.onNeoPixel?.(count >>> 0); });
    }

    /** Copy WASM state views into the cached JS mirror; set dirty on diff. */
    protected pullWasmState(): void {
        if (!this.core) return;
        let views: { f: Float32Array; i: Int32Array } | null = null;
        try {
            views = this.core.readStateViews();
        } catch {
            return;
        }
        if (!views) return;
        const next: Record<string, any> = {};
        const names = this.manifest?.sab?.fields || {};
        const entries = Object.entries(names) as [string, string][];
        let changed = false;
        for (const [slotKey, fieldName] of entries) {
            let v: number | undefined;
            if (slotKey.startsWith('f')) {
                const k = Number(slotKey.slice(1));
                if (Number.isFinite(k) && k < views.f.length) v = views.f[k];
            } else if (slotKey.startsWith('i')) {
                const k = Number(slotKey.slice(1));
                if (Number.isFinite(k) && k < views.i.length) v = views.i[k];
            }
            if (v !== undefined) {
                next[fieldName] = v;
                if (this.cachedMirror[fieldName] !== v) changed = true;
            }
        }
        if (changed) {
            this.cachedMirror = { ...this.cachedMirror, ...next };
            this.setState(this.cachedMirror);
        }
    }

    getSyncState(): any {
        // WASM path: cached mirror only, never allocates per frame beyond the
        // base spread (same contract as JS components).
        if (this.wasmReady && Object.keys(this.cachedMirror).length > 0) {
            return { ...super.getSyncState(), ...this.cachedMirror };
        }
        return super.getSyncState();
    }
}
