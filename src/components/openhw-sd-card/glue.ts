// sd-card glue.ts — WASM loader (separate from index.ts by design).
// Activity/counter core ships at ./core/sd_card_core_bg.wasm.
// FAT/block-device emulation stays in JS (littlefs.wasm + JS shim); the core
// owns per-byte counters + activity decay. Any failure → null → JS wins.
import type { WasmCore, WasmGlueLoader } from '../WasmComponent';
import { WASM_ABI_VERSION } from '../WasmComponent';

export const sdCardGlueLoader: WasmGlueLoader = {
    async load(manifest: any): Promise<WasmCore | null> {
        const wantAbi = Number(manifest?.wasm?.abi ?? 1);
        if (wantAbi !== WASM_ABI_VERSION) {
            console.warn(`[sd-card glue] ABI mismatch (want ${wantAbi}, have ${WASM_ABI_VERSION}); using JS fallback.`);
            return null;
        }
        try {
            const glue: any = await import('./core/sd_card_core.js');
            const wasmUrlMod: any = await import('./core/sd_card_core_bg.wasm?url');
            const wasm = await glue.default(String(wasmUrlMod?.default ?? wasmUrlMod));
            const handle = Number(wasm.sdcard_create?.());
            if (!Number.isFinite(handle) || handle <= 0) return null;
            const core: WasmCore = {
                memory: (wasm.memory?.buffer ?? new ArrayBuffer(0)) as ArrayBuffer,
                update(cycles: number) { wasm.sdcard_update(handle, cycles >>> 0); },
                readStateViews() {
                    try {
                        const live = (wasm.memory as WebAssembly.Memory | undefined)?.buffer;
                        if (!live) return null;
                        const ptr = Number(wasm.sdcard_state_ptr?.(handle) ?? -1);
                        if (ptr < 0) return null;
                        return {
                            f: new Float32Array(live, ptr, 2),
                            i: new Int32Array(live, ptr + 8, 1),
                        };
                    } catch { return null; }
                },
                destroy() { try { wasm.sdcard_destroy?.(handle); } catch { /* ignore */ } },
            };
            return core;
        } catch (err) {
            console.warn('[sd-card glue] WASM core unavailable, using JS fallback:', (err as any)?.message || err);
            return null;
        }
    },
};
