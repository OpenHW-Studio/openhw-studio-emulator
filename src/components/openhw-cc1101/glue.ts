// cc1101 glue.ts — WASM core loader (same shape as max30102/glue.ts).
//
// index.ts = declarative registry record (import-safe everywhere).
// glue.ts  = imperative WASM loader (dynamic import, ABI check).
//
// Prebuilt core ships at ./core/cc1101_core_bg.wasm + ./core/cc1101_core.js
// (built from core-rs/ with cargo + wasm-bindgen --target web --out-dir).
// Load is lazy (runner calls ensureWasmLoaded() once, never in tick).
// Any failure → null → logic.ts falls back to the JS reference.
// Determinism: register/SPI logic only — no clocks, no randomness.

import type { WasmCore, WasmGlueLoader } from '../WasmComponent';
import { WASM_ABI_VERSION } from '../WasmComponent';

export const CC1101_WASM_ABI = 1;

// i32 view layout (see core-rs/src/lib.rs): index 0 state (0 IDLE, 1 RX,
// 2 TX), 1 tx_ready, 2 tx_len, 3 rx_count, 4 gdo0, 5 freq_hz, 6..7 reserved.
export const CC1101_VIEW_LEN = 8;

export interface Cc1101WasmCore extends WasmCore {
    handle: number;
    /** CS edge: active=true assert, false deassert (ends frame). */
    cs(active: boolean): void;
    /** One SPI byte exchange. Returns the MISO byte. */
    spiByte(byte: number): number;
    /** Inject an airwave-received payload (RX-state gate applied in-core). */
    radioRx(payload: Uint8Array): void;
    /** Pending-TX payload bytes (valid when view.tx_ready is set). */
    txPayload(): Uint8Array | null;
    /** Mark the pending TX consumed (clears flags). */
    txConsumed(): void;
    /** Fresh i32 view of core state. */
    view(): Int32Array;
}

export const cc1101GlueLoader: WasmGlueLoader = {
    async load(manifest: any): Promise<WasmCore | null> {
        const wantAbi = Number(manifest?.wasm?.abi ?? CC1101_WASM_ABI);
        if (wantAbi !== WASM_ABI_VERSION) {
            console.warn(`[cc1101 glue] ABI mismatch (want ${wantAbi}, have ${WASM_ABI_VERSION}); using JS fallback.`);
            return null;
        }
        try {
            const glue: any = await import('./core/cc1101_core.js');
            const wasmUrlMod: any = await import('./core/cc1101_core_bg.wasm?url');
            const wasmUrl = String(wasmUrlMod?.default ?? wasmUrlMod);
            const wasm = await glue.default(wasmUrl);
            const handle = Number(wasm.cc1101_create?.());
            if (!Number.isFinite(handle) || handle <= 0) return null;
            const mem = (): ArrayBuffer | null => {
                try {
                    const m = wasm.memory as WebAssembly.Memory | undefined;
                    const buf = m?.buffer as ArrayBuffer | undefined;
                    return buf ?? null;
                } catch { return null; }
            };
            const view = (): Int32Array => {
                const buf = mem();
                if (!buf) return new Int32Array(0);
                const ptr = Number(wasm.cc1101_state_ptr?.(handle) ?? 0);
                if (ptr <= 0) return new Int32Array(0);
                return new Int32Array(buf, ptr, CC1101_VIEW_LEN);
            };
            const core: Cc1101WasmCore = {
                handle,
                memory: (mem() ?? new ArrayBuffer(0)) as ArrayBuffer,
                update(_cycles: number) { /* edge-driven; nothing time-based */ },
                readStateViews() {
                    const buf = mem();
                    if (!buf) return null;
                    const ptr = Number(wasm.cc1101_state_ptr?.(handle) ?? 0);
                    if (ptr <= 0) return null;
                    return {
                        f: new Float32Array(buf, ptr, 0),
                        i: new Int32Array(buf, ptr, CC1101_VIEW_LEN),
                    };
                },
                destroy() { try { wasm.cc1101_destroy?.(handle); } catch { /* ignore */ } },
                cs(active: boolean) { wasm.cc1101_cs?.(handle, active ? 1 : 0); },
                spiByte(byte: number) { return Number(wasm.cc1101_spi?.(handle, byte & 0xff) ?? 0xff); },
                radioRx(payload: Uint8Array) {
                    try { wasm.cc1101_radio_rx?.(handle, payload); } catch { /* ignore */ }
                },
                txPayload() {
                    const buf = mem();
                    if (!buf) return null;
                    const v = view();
                    if (v.length < 3 || v[1] !== 1) return null;
                    const len = Math.max(0, Math.min(64, v[2] | 0));
                    if (len === 0) return null;
                    const ptr = Number(wasm.cc1101_tx_ptr?.(handle) ?? 0);
                    if (ptr <= 0) return null;
                    return new Uint8Array(buf, ptr, len).slice();
                },
                txConsumed() { try { wasm.cc1101_tx_consumed?.(handle); } catch { /* ignore */ } },
                view() { return view().slice(); },
            };
            return core;
        } catch {
            return null;
        }
    },
};
