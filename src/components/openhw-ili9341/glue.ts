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
            // Input scratch: raw SPI bytes (RAMWR chunk 4096 B) or the RGB565
            // DMA frame (240*320*2 = 153600 B). Allocated ONCE as a plain
            // JS-side staging buffer sized to the worst case — copied into
            // a wasm-memory window (below) per blit. Per-blit cost is one
            // bulk set() + one kernel call + one bulk copy-back: still a
            // single boundary crossing for the CONVERT, which is where the
            // 6-13x win lives (measured, see futureplan §12.5).
            const SCRATCH_LEN = 4096 + 240 * 320 * 2;
            // WASM-memory window: the framebuffer lives in a static pool at
            // a fixed address (see core ensure_fb) — the window sits right
            // AFTER it, computed once from fb_ptr/fb_len and re-validated
            // per call (memory growth detaches ArrayBuffers; the addresses
            // stay valid but views must be re-created — see liveMem()).
            let winPtr = 0;
            const ensureWindow = (): number => {
                try {
                    const fbPtr = Number((wasm as any).ili9341_fb_ptr?.(handle) ?? 0);
                    const fbLen = Number((wasm as any).ili9341_fb_len?.() ?? 0);
                    if (!(fbPtr > 0) || !(fbLen > 0)) return 0;
                    const memBytes = Number(
                        (wasm.memory as WebAssembly.Memory | undefined)?.buffer?.byteLength ?? 0);
                    // 64 KB headroom for state words/stack; window must fit.
                    const candidate = (fbPtr + fbLen + 1024) >>> 0;
                    if (!(memBytes > 0) || candidate + SCRATCH_LEN > memBytes) return 0;
                    winPtr = candidate;
                    return winPtr;
                } catch { return 0; }
            };
            const liveMem = (): ArrayBuffer | null => {
                try {
                    return (wasm.memory as WebAssembly.Memory | undefined)?.buffer ?? null;
                } catch { return null; }
            };
            const core: WasmCore = {
                memory: (wasm.memory?.buffer ?? new ArrayBuffer(0)) as ArrayBuffer,
                update(cycles: number) { wasm.ili9341_update(handle, cycles >>> 0); },
                markDirty(powerOn: number) {
                    try { wasm.ili9341_mark_dirty(handle, powerOn ? 1 : 0); } catch { /* ignore */ }
                },
                setWindow(cs: number, ce: number, rs: number, re: number, madctl: number) {
                    try {
                        (wasm as any).ili9341_set_window?.(
                            handle, cs >>> 0, ce >>> 0, rs >>> 0, re >>> 0, madctl & 0xff);
                    } catch { /* ignore */ }
                },
                ramwrBegin() {
                    try { (wasm as any).ili9341_ramwr_begin?.(handle); } catch { /* ignore */ }
                },
                // Batched RAMWR ingest — ONE kernel crossing for the whole
                // stream: stage bytes into the wasm window, convert into the
                // core-owned framebuffer, bulk-copy into the SAB VRAM.
                // Returns pixels written (0 = JS fallback path).
                // NOTE: views are re-created AFTER every kernel call because
                // wasm linear memory may grow (detaching old ArrayBuffers).
                ramwrBlit(bytes: Uint8Array, vram: Uint8Array): number {
                    try {
                        if (bytes.length === 0) return 0;
                        const base = ensureWindow();
                        let live = liveMem();
                        if (base === 0 || !live) return 0;
                        const fbPtr = Number((wasm as any).ili9341_fb_ptr?.(handle) ?? 0);
                        const fbLen = Number((wasm as any).ili9341_fb_len?.() ?? 0);
                        if (!(fbPtr > 0) || !(fbLen > 0)) return 0;
                        const n = Math.min(bytes.length, SCRATCH_LEN);
                        new Uint8Array(live, base, n).set(bytes.subarray(0, n));
                        const written = Number(
                            (wasm as any).ili9341_ramwr_blit?.(handle, base >>> 0, n >>> 0) ?? 0);
                        if (!(written > 0)) return 0;
                        // ONE bulk copy, framebuffer → SAB VRAM.
                        live = liveMem();
                        if (!live) return 0;
                        const want = Math.min(vram.length, fbLen);
                        vram.set(new Uint8Array(live, fbPtr, want).subarray(0, want));
                        return written;
                    } catch { return 0; }
                },
                // Full-frame DMA ingest — ONE kernel crossing for 153600 B:
                // same window → kernel → bulk-copy pattern as ramwrBlit.
                dmaBlit(dma: Uint8Array, vram: Uint8Array): number {
                    try {
                        if (dma.length < 240 * 320 * 2) return 0;
                        const base = ensureWindow();
                        let live = liveMem();
                        if (base === 0 || !live) return 0;
                        const fbPtr = Number((wasm as any).ili9341_fb_ptr?.(handle) ?? 0);
                        const fbLen = Number((wasm as any).ili9341_fb_len?.() ?? 0);
                        if (!(fbPtr > 0) || !(fbLen > 0)) return 0;
                        const n = 240 * 320 * 2;
                        new Uint8Array(live, base, n).set(dma.subarray(0, n));
                        const done = Number(
                            (wasm as any).ili9341_dma_blit_rgb565?.(handle, base >>> 0, n >>> 0) ?? 0);
                        if (!(done > 0)) return 0;
                        live = liveMem();
                        if (!live) return 0;
                        const want = Math.min(vram.length, fbLen);
                        vram.set(new Uint8Array(live, fbPtr, want).subarray(0, want));
                        return done;
                    } catch { return 0; }
                },
                // Telemetry helpers — replace the 76.8k JS scan + CRC table.
                fillPercentX10(): number {
                    try { return Number((wasm as any).ili9341_fill_percent_x10?.(handle) ?? 0); }
                    catch { return 0; }
                },
                crc32Of(prefix: Uint8Array): number {
                    try {
                        const base = ensureWindow();
                        const live = liveMem();
                        if (base === 0 || !live || prefix.length === 0) return 0;
                        const n = Math.min(prefix.length, SCRATCH_LEN);
                        new Uint8Array(live, base, n).set(prefix.subarray(0, n));
                        return Number((wasm as any).ili9341_crc32?.(handle, base >>> 0, n >>> 0) ?? 0) >>> 0;
                    } catch { return 0; }
                },
                ramwrCursor(): { x: number; y: number } | null {
                    try {
                        const packed = Number((wasm as any).ili9341_ramwr_cursor?.(handle) ?? 0) >>> 0;
                        return { x: packed & 0xffff, y: (packed >>> 16) & 0xffff };
                    } catch { return null; }
                },
                onSPIByte(data: number) {
                    return Number(wasm.ili9341_on_spi?.(handle, data & 0xff) ?? 0xff);
                },
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
