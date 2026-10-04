// NeoPixel glue.ts — WASM framer loader (same shape as max30102/glue.ts).
//
// Prebuilt core ships at ./core/neopixel_core_bg.wasm + ./core/neopixel_core.js
// (built from core-rs/ with cargo + wasm-bindgen --target web --out-dir).
// Load is lazy (runner calls ensureWasmLoaded() once, never in tick).
// Any failure → null → NeoPixelProtocol falls back to the JS reference
// framer (bit-exact shared semantics in NeoPixelBusFramer.clockEdge).
// Determinism: integer cycle counts in — no clocks, no randomness.

import type { WasmCore, WasmGlueLoader } from '../WasmComponent';
import { WASM_ABI_VERSION } from '../WasmComponent';

export const NEOPIXEL_WASM_ABI = 1;

export interface NeoPixelWasmCore extends WasmCore {
    handle: number;
    /** CPU frequency for timing thresholds (MHz). */
    setFreq(mhz: number): void;
    /** Reset framer state. */
    reset(): void;
    /**
     * One DIN level step. Returns the completed pixel array (packed
     * 0xRRGGBB) when a frame latched, else null.
     */
    edge(high: boolean, cycles: number): number[] | null;
    /**
     * Idle-timeout latch for show()-once firmware. Returns pixels when
     * the line idled past the reset window, else null.
     */
    poll(cycles: number): number[] | null;
}

export const neoPixelGlueLoader: WasmGlueLoader = {
    async load(manifest: any): Promise<WasmCore | null> {
        const wantAbi = Number(manifest?.wasm?.abi ?? NEOPIXEL_WASM_ABI);
        if (wantAbi !== WASM_ABI_VERSION) {
            console.warn(`[neopixel glue] ABI mismatch (want ${wantAbi}, have ${WASM_ABI_VERSION}); using JS fallback.`);
            return null;
        }
        try {
            const glue: any = await import('./core/neopixel_core.js');
            const wasmUrlMod: any = await import('./core/neopixel_core_bg.wasm?url');
            const wasmUrl = String(wasmUrlMod?.default ?? wasmUrlMod);
            const wasm = await glue.default(wasmUrl);
            const handle = Number(wasm.neo_create?.());
            if (!Number.isFinite(handle) || handle <= 0) return null;
            const readPixels = (): number[] | null => {
                try {
                    const n = Number(wasm.neo_out_len?.(handle) ?? 0);
                    if (!Number.isFinite(n) || n <= 0) return null;
                    const ptr = Number(wasm.neo_out_ptr?.(handle) ?? 0);
                    if (ptr <= 0) return null;
                    const mem = wasm.memory as WebAssembly.Memory | undefined;
                    const buf = mem?.buffer as ArrayBuffer | undefined;
                    if (!buf) return null;
                    return Array.from(new Uint32Array(buf, ptr, Math.min(512, n)));
                } catch { return null; }
            };
            const core: NeoPixelWasmCore = {
                handle,
                memory: (() => {
                    try {
                        const m = wasm.memory as WebAssembly.Memory | undefined;
                        return (m?.buffer as ArrayBuffer | undefined) ?? new ArrayBuffer(0);
                    } catch { return new ArrayBuffer(0); }
                })() as ArrayBuffer,
                update(_cycles: number) { /* edge-driven; idle latch via poll() */ },
                readStateViews() { return null; },
                destroy() { try { wasm.neo_destroy?.(handle); } catch { /* ignore */ } },
                setFreq(mhz: number) { try { wasm.neo_set_freq?.(handle, Math.max(1, Math.round(mhz))); } catch { /* ignore */ } },
                reset() { try { wasm.neo_reset?.(handle); } catch { /* ignore */ } },
                edge(high: boolean, cycles: number) {
                    try {
                        const ready = Number(wasm.neo_edge?.(handle, high ? 1 : 0, cycles >>> 0) ?? 0);
                        return ready === 1 ? readPixels() : null;
                    } catch { return null; }
                },
                poll(cycles: number) {
                    try {
                        const ready = Number(wasm.neo_poll?.(handle, cycles >>> 0) ?? 0);
                        return ready === 1 ? readPixels() : null;
                    } catch { return null; }
                },
            };
            return core;
        } catch {
            return null;
        }
    },
};
