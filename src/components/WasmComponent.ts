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
//     readStateViews(): { f: Float32Array; i: Int32Array } | null;
//     destroy?(): void;
//   }
// Strings NEVER cross the boundary in the hot path (see §5).

import { BaseComponent } from './BaseComponent';

/** WASM ABI version both sides must agree on (manifest.wasm.abi vs worker). */
export const WASM_ABI_VERSION = 1;

export interface WasmCore {
    readonly memory: ArrayBuffer | SharedArrayBuffer;
    update(cycles: number): void;
    onPin?(pinIdx: number, high: number, cycles: number): void;
    onI2CByte?(addr: number, data: number): number;
    onSPIByte?(data: number): number;
    /** Event-path dirty notify (display descriptor cores: mark_dirty). */
    markDirty?(flag: number): void;
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

    update(cpuCycles: number, wires: any[], instances: BaseComponent[]): void {
        if (this.core && this.wasmReady) {
            try {
                this.core.update(cpuCycles);
                this.pullWasmState();
                return;
            } catch {
                this.wasmReady = false;
                this.core = null;
            }
        }
        this.fallbackUpdate(cpuCycles, wires, instances);
    }

    onPinStateChange(pinId: string, isHigh: boolean, cpuCycles: number): void {
        if (this.core && this.wasmReady && typeof this.core.onPin === 'function') {
            const idx = this.pinIndex.get(String(pinId));
            if (idx !== undefined) {
                try {
                    this.core.onPin(idx, isHigh ? 1 : 0, cpuCycles);
                    return;
                } catch {
                    this.wasmReady = false;
                    this.core = null;
                }
            }
        }
        super.onPinStateChange(pinId, isHigh, cpuCycles);
    }

    // NOTE: no onI2C*/onSPIByte overrides here — BaseComponent declares them
    // as optional interface methods with NO implementation, so super calls
    // would not compile. Subclasses (e.g. MAX30102Logic) keep their own JS
    // bus state machines; the WASM core handles DSP (update) only. A future
    // core with bus support can call this.core.onI2CByte directly from the
    // subclass override.

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
