// ssd1306 glue.ts — WASM loader (separate from index.ts by design).
// Display-descriptor core ships at ./core/ssd1306_oled_core_bg.wasm.
// I2C register shadow + 1K VRAM stay in JS; the core owns frame pacing +
// descriptor numerics. Any failure → null → JS fallback wins.
import type { WasmCore, WasmGlueLoader } from '../WasmComponent';
import { WASM_ABI_VERSION } from '../WasmComponent';

export const ssd1306GlueLoader: WasmGlueLoader = {
    async load(manifest: any): Promise<WasmCore | null> {
        const wantAbi = Number(manifest?.wasm?.abi ?? 1);
        if (wantAbi !== WASM_ABI_VERSION) {
            console.warn(`[ssd1306 glue] ABI mismatch (want ${wantAbi}, have ${WASM_ABI_VERSION}); using JS fallback.`);
            return null;
        }
        try {
            const glue: any = await import('./core/ssd1306_oled_core.js');
            const wasmUrlMod: any = await import('./core/ssd1306_oled_core_bg.wasm?url');
            const wasm = await glue.default(String(wasmUrlMod?.default ?? wasmUrlMod));
            const handle = Number(wasm.ssd1306_create?.());
            if (!Number.isFinite(handle) || handle <= 0) return null;
            const core: WasmCore = {
                memory: (wasm.memory?.buffer ?? new ArrayBuffer(0)) as ArrayBuffer,
                update(cycles: number) { wasm.ssd1306_update(handle, cycles >>> 0); },
                readStateViews() {
                    try {
                        const live = (wasm.memory as WebAssembly.Memory | undefined)?.buffer;
                        if (!live) return null;
                        const ptr = Number(wasm.ssd1306_state_ptr?.(handle) ?? -1);
                        if (ptr < 0) return null;
                        return {
                            f: new Float32Array(live, ptr, 1),
                            i: new Int32Array(live, ptr + 4, 2),
                        };
                    } catch { return null; }
                },
                destroy() { try { wasm.ssd1306_destroy?.(handle); } catch { /* ignore */ } },
            };
            return core;
        } catch (err) {
            console.warn('[ssd1306 glue] WASM core unavailable, using JS fallback:', (err as any)?.message || err);
            return null;
        }
    },
};
