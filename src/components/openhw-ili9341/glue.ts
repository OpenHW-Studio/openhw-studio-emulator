// ili9341 glue.ts — WASM loader (separate from index.ts by design).
// Display-descriptor pacing core ships at ./core/ili9341_core_bg.wasm.
// VRAM (SAB-backed) + SPI state machine stay in JS; the core paces dirty +
// sync counters. Any failure → null → JS fallback wins.
import type { WasmCore, WasmGlueLoader } from '../WasmComponent';
import { WASM_ABI_VERSION } from '../WasmComponent';

export const ili9341GlueLoader: WasmGlueLoader = {
    async load(manifest: any): Promise<WasmCore | null> {
        const wantAbi = Number(manifest?.wasm?.abi ?? 1);
        if (wantAbi !== WASM_ABI_VERSION) {
            console.warn(`[ili9341 glue] ABI mismatch (want ${wantAbi}, have ${WASM_ABI_VERSION}); using JS fallback.`);
            return null;
        }
        try {
            const glue: any = await import('./core/ili9341_core.js');
            const wasmUrlMod: any = await import('./core/ili9341_core_bg.wasm?url');
            const wasm = await glue.default(String(wasmUrlMod?.default ?? wasmUrlMod));
            const handle = Number(wasm.ili9341_create?.());
            if (!Number.isFinite(handle) || handle <= 0) return null;
            const core: WasmCore = {
                memory: (wasm.memory?.buffer ?? new ArrayBuffer(0)) as ArrayBuffer,
                update(cycles: number) { wasm.ili9341_update(handle, cycles >>> 0); },
                readStateViews() {
                    try {
                        const live = (wasm.memory as WebAssembly.Memory | undefined)?.buffer;
                        if (!live) return null;
                        const ptr = Number(wasm.ili9341_state_ptr?.(handle) ?? -1);
                        if (ptr < 0) return null;
                        return {
                            f: new Float32Array(live, ptr, 1),
                            i: new Int32Array(live, ptr + 4, 2),
                        };
                    } catch { return null; }
                },
                destroy() { try { wasm.ili9341_destroy?.(handle); } catch { /* ignore */ } },
            };
            return core;
        } catch (err) {
            console.warn('[ili9341 glue] WASM core unavailable, using JS fallback:', (err as any)?.message || err);
            return null;
        }
    },
};
