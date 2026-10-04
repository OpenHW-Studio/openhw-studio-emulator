// nRF24L01+ glue.ts — WASM core loader (same shape as max30102/glue.ts).
//
// index.ts = declarative registry record (import-safe everywhere).
// glue.ts  = imperative WASM loader (dynamic import, ABI check).
//
// Prebuilt core ships at ./core/nrf24_core_bg.wasm + ./core/nrf24_core.js
// (built from core-rs/ with cargo + wasm-bindgen --target web --out-dir).
// Load is lazy (runner calls ensureWasmLoaded() once, never in tick).
// Any failure → null → logic.ts falls back to the JS reference.
// Determinism: register/SPI/cycle logic only — no clocks, no randomness.

import type { WasmCore, WasmGlueLoader } from '../WasmComponent';
import { WASM_ABI_VERSION } from '../WasmComponent';

export const NRF24_WASM_ABI = 1;

// i32 view layout (see core-rs/src/lib.rs): index 0 status, 1 config,
// 2 tx_ready, 3 tx_len, 4 rx_count, 5 irq_low, 6 freq_hz, 7 bandwidth_hz.
export const NRF24_VIEW_LEN = 8;

export interface Nrf24WasmCore extends WasmCore {
    handle: number;
    /** CS edge: active=true assert, false deassert (latches TX payload). */
    cs(active: boolean): void;
    /** CE edge. Returns irq_low after handling. */
    ce(high: boolean): number;
    /** One SPI byte exchange. Returns the MISO byte. */
    spiByte(byte: number): number;
    /** Inject an airwave-received payload (PRX+CE gate applied in-core). */
    radioRx(payload: Uint8Array): void;
    /** Pending-TX payload bytes (valid when view.tx_ready is set). */
    txPayload(): Uint8Array | null;
    /** Mark the pending TX consumed (sets TX_DS, clears flags). */
    txConsumed(): void;
    /** Fresh i32 view of core state. */
    view(): Int32Array;
    /** Current IRQ level (1 = asserted active-low). */
    irq(): number;
}

export const nrf24GlueLoader: WasmGlueLoader = {
    async load(manifest: any): Promise<WasmCore | null> {
        const wantAbi = Number(manifest?.wasm?.abi ?? NRF24_WASM_ABI);
        if (wantAbi !== WASM_ABI_VERSION) {
            console.warn(`[nrf24 glue] ABI mismatch (want ${wantAbi}, have ${WASM_ABI_VERSION}); using JS fallback.`);
            return null;
        }
        try {
            const glue: any = await import('./core/nrf24_core.js');
            const wasmUrlMod: any = await import('./core/nrf24_core_bg.wasm?url');
            const wasmUrl = String(wasmUrlMod?.default ?? wasmUrlMod);
            const wasm = await glue.default(wasmUrl);
            const handle = Number(wasm.nrf24_create?.());
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
                const ptr = Number(wasm.nrf24_state_ptr?.(handle) ?? 0);
                if (ptr <= 0) return new Int32Array(0);
                return new Int32Array(buf, ptr, NRF24_VIEW_LEN);
            };
            const core: Nrf24WasmCore = {
                handle,
                memory: (mem() ?? new ArrayBuffer(0)) as ArrayBuffer,
                update(_cycles: number) { /* edge-driven; nothing time-based */ },
                readStateViews() {
                    const buf = mem();
                    if (!buf) return null;
                    const ptr = Number(wasm.nrf24_state_ptr?.(handle) ?? 0);
                    if (ptr <= 0) return null;
                    return {
                        f: new Float32Array(buf, ptr, 0),
                        i: new Int32Array(buf, ptr, NRF24_VIEW_LEN),
                    };
                },
                destroy() { try { wasm.nrf24_destroy?.(handle); } catch { /* ignore */ } },
                cs(active: boolean) { wasm.nrf24_cs?.(handle, active ? 1 : 0); },
                ce(high: boolean) { return Number(wasm.nrf24_ce?.(handle, high ? 1 : 0) ?? 0); },
                spiByte(byte: number) { return Number(wasm.nrf24_spi?.(handle, byte & 0xff) ?? 0xff); },
                radioRx(payload: Uint8Array) {
                    try { wasm.nrf24_radio_rx?.(handle, payload); } catch { /* ignore */ }
                },
                txPayload() {
                    const buf = mem();
                    if (!buf) return null;
                    const v = view();
                    if (v.length < 4 || v[2] !== 1) return null;
                    const len = Math.max(0, Math.min(32, v[3] | 0));
                    if (len === 0) return null;
                    const ptr = Number(wasm.nrf24_tx_ptr?.(handle) ?? 0);
                    if (ptr <= 0) return null;
                    return new Uint8Array(buf, ptr, len).slice();
                },
                txConsumed() { try { wasm.nrf24_tx_consumed?.(handle); } catch { /* ignore */ } },
                view() { return view().slice(); },
                irq() { return Number(wasm.nrf24_irq?.(handle) ?? 0); },
            };
            return core;
        } catch {
            return null;
        }
    },
};
