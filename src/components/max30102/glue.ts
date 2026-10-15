// max30102 glue.ts — WASM pilot loader (separate from index.ts by design).
//
// index.ts = declarative registry record (import-safe everywhere).
// glue.ts  = imperative WASM loader (dynamic import, SAB mapping, ABI check).
//
// Pilot strategy: prebuilt core ships at ./core/max30102_core_bg.wasm +
// ./core/max30102_core.js (built from core-rs/ with wasm-pack --target web).
// Load is lazy (runner calls ensureWasmLoaded() once, never in tick).
// Any failure → null → WasmComponent falls back to the JS reference in
// logic.ts. Determinism: core uses cycle counts only, never Date.now().

import type { WasmCore, WasmGlueLoader } from '../WasmComponent';
import { WASM_ABI_VERSION } from '../WasmComponent';

export const MAX30102_WASM_ABI = 1;

export const max30102GlueLoader: WasmGlueLoader = {
    async load(manifest: any): Promise<WasmCore | null> {
        const wantAbi = Number(manifest?.wasm?.abi ?? MAX30102_WASM_ABI);
        if (wantAbi !== WASM_ABI_VERSION) {
            console.warn(`[max30102 glue] ABI mismatch (want ${wantAbi}, have ${WASM_ABI_VERSION}); using JS fallback.`);
            return null;
        }
        try {
            // wasm-pack --target web output: default export is the init fn
            // (same shape as the grading engine). Vite resolves ?url for the
            // .wasm companion. core/ ships verbatim — dynamic import only.
            const glue: any = await import('./core/max30102_core.js');
            const wasmUrlMod: any = await import('./core/max30102_core_bg.wasm?url');
            const wasmUrl = String(wasmUrlMod?.default ?? wasmUrlMod);
            const wasm = await glue.default(wasmUrl);
            const handle = Number(wasm.max30102_create?.());
            if (!Number.isFinite(handle) || handle <= 0) return null;
            const mem = wasm.memory as WebAssembly.Memory | undefined;
            const buf = mem?.buffer as ArrayBuffer | undefined;
            const core: WasmCore = {
                memory: (buf ?? new ArrayBuffer(0)) as ArrayBuffer,
                update(cycles: number) { wasm.max30102_update(handle, cycles >>> 0); },
                onPin(pinIdx: number, high: number, cycles: number) {
                    wasm.max30102_on_pin?.(handle, pinIdx >>> 0, high ? 1 : 0, cycles >>> 0);
                },
                onI2CByte(addr: number, data: number) {
                    return Number(wasm.max30102_on_i2c?.(handle, addr & 0x7f, data & 0xff) ?? 1);
                },
                onSPIByte(data: number) {
                    return Number(wasm.max30102_on_spi?.(handle, data & 0xff) ?? 0);
                },
                readStateViews() {
                    try {
                        const live = (wasm.memory as WebAssembly.Memory | undefined)?.buffer;
                        if (!live) return null;
                        const ptr = Number(wasm.max30102_state_ptr?.(handle) ?? -1);
                        if (ptr < 0) return null;
                        // Layout: f32[2] {spo2, heartRate} @ ptr, i32[1] {redLedOn} @ ptr+8.
                        return {
                            f: new Float32Array(live, ptr, 2),
                            i: new Int32Array(live, ptr + 8, 1),
                        };
                    } catch { return null; }
                },
                destroy() { try { wasm.max30102_destroy?.(handle); } catch { /* ignore */ } },
            };
            void buf;
            return core;
        } catch (err) {
            // No core shipped yet (or load blocked) — JS fallback wins.
            console.warn('[max30102 glue] WASM core unavailable, using JS fallback:', (err as any)?.message || err);
            return null;
        }
    },
};
