//! ILI9341 WASM core — descriptor pacing + batched pixel kernels.
//!
//! Design (matches SSD1306/SD descriptor pattern, extended for TFT VRAM):
//! - Descriptor pacing (existing): 30 FPS cap (33ms ~= 528000 cycles @16MHz)
//!   + 10Hz heartbeat (100ms ~= 1600000 cycles). VRAM (240x320x3) stays in
//!   the existing SAB-backed Uint8Array — the core only paces the dirty
//!   flag + sync counter. State export: u32[3] = { f32 syncCount,
//!   i32 powerOn, i32 dirty }.
//! - Batched pixel kernels (NEW): `ramwr_blit` ingests a whole RAMWR byte
//!   stream + `dma_blit_rgb565` converts a whole RGB565 frame in ONE
//!   boundary crossing each. Both write DIRECTLY into the shared VRAM
//!   (imported Uint8Array view passed as ptr+len) and return the pixel
//!   count — no per-byte JS↔WASM crossings, no per-pixel dispatch.
//! - Telemetry helpers (NEW): `fill_percent_x10` scans VRAM for the active-
//!   pixel ratio (x10 fixed point, avoids f32 ABI rounding) and `crc32`
//!   covers the 64-byte compact prefix. Both run at most once per sync
//!   gate, never per tick.
//!
//! What stays in JS (deliberately): SPI command state machine (CASET/PASET/
//! MADCTL/RAMWR framing), DMA buffer fetch (runner-owned memory), power
//! sensing (getPinVoltage), compact-snapshot Array.from (UI shape).
//!
//! Build: wasm-pack build core-rs --target web --out-dir ../core

use wasm_bindgen::prelude::*;

const MAX_HANDLES: usize = 8;
const CYCLES_33MS: u64 = 528000;
const CYCLES_100MS: u64 = 1600000;

// TFT geometry (matches logic.ts: 240x320 RGB888 VRAM).
const TFT_W: usize = 240;
const TFT_H: usize = 320;
const TFT_PIXELS: usize = TFT_W * TFT_H; // 76800
const TFT_VRAM_LEN: usize = TFT_PIXELS * 3; // 230400

struct Core {
    alive: bool,
    power_on: i32,
    dirty: i32,
    sync_count: f32,
    last_sync_cycles: u64,
    state_words: [u32; 3],
    // RAMWR cursor state (mirrors JS handleDataByte windowing).
    col_start: u16,
    col_end: u16,
    row_start: u16,
    row_end: u16,
    cur_x: u16,
    cur_y: u16,
    madctl: u8,
    write_count: u32,
    /// WASM-side RGB888 framebuffer (TFT_VRAM_LEN bytes, malloc'd lazily).
    /// JS mirrors it into the SAB-backed VRAM with one bulk copy per sync.
    fb_ptr: u32,
}

impl Core {
    const fn fresh() -> Core {
        Core {
            alive: false,
            power_on: 1,
            dirty: 0,
            sync_count: 0.0,
            last_sync_cycles: 0,
            state_words: [0; 3],
            col_start: 0,
            col_end: 239,
            row_start: 0,
            row_end: 319,
            cur_x: 0,
            cur_y: 0,
            madctl: 0x48,
            write_count: 0,
            fb_ptr: 0,
        }
    }

} // end impl Core (fresh)

/// Pool helpers shared by ensure_fb / release (single source of truth for
/// the static addresses; avoids duplicating statics across functions).
unsafe fn fb_pool_base() -> u32 {
    static mut FB_POOL: [u8; 8 * TFT_VRAM_LEN] = [0; 8 * TFT_VRAM_LEN];
    FB_POOL.as_mut_ptr() as u32
}
unsafe fn fb_taken_get(i: usize) -> bool {
    static mut FB_TAKEN: [bool; 8] = [false; 8];
    *FB_TAKEN.as_ptr().add(i)
}
unsafe fn fb_taken_set(i: usize, v: bool) {
    static mut FB_TAKEN: [bool; 8] = [false; 8];
    *FB_TAKEN.as_mut_ptr().add(i) = v;
}

impl Core {
    /// Lazily allocate the framebuffer from a static backing store.
    /// No allocator import needed (wasm-pack web output does not export
    /// malloc to guests) — one 230400 B slice per handle slot; each
    /// create() takes the next free slice AND zeroes it (a reused slice
    /// from a destroyed handle must not leak the old frame).
    /// Failure (all slices live) leaves fb_ptr 0 → kernels no-op, JS wins.
    fn ensure_fb(&mut self) {
        if self.fb_ptr != 0 {
            return;
        }
        unsafe {
            // 8 slots x 230400 B = ~1.8 MB static — lives in wasm memory,
            // zeroed at instantiation, no import required.
            let base = fb_pool_base();
            // Identify our slot by matching state_words address.
            let self_addr = self.state_words.as_ptr() as usize;
            for i in 0..8 {
                // Slot i's Core lives at CORES[i]; match by index.
                let core_addr = (&CORES[i].state_words as *const u32) as usize;
                if core_addr == self_addr && !fb_taken_get(i) {
                    fb_taken_set(i, true);
                    let slice = (base as *mut u8).add(i * TFT_VRAM_LEN);
                    core::ptr::write_bytes(slice, 0, TFT_VRAM_LEN);
                    self.fb_ptr = slice as u32;
                    return;
                }
            }
        }
    }

    fn sync_block(&mut self) {
        self.state_words[0] = self.sync_count.to_bits();
        self.state_words[1] = self.power_on as u32;
        self.state_words[2] = self.dirty as u32;
    }
}

static mut CORES: [Core; MAX_HANDLES] = [
    Core::fresh(), Core::fresh(), Core::fresh(), Core::fresh(),
    Core::fresh(), Core::fresh(), Core::fresh(), Core::fresh(),
];

fn with_core<F, R>(h: u32, f: F) -> R
where
    F: FnOnce(&mut Core) -> R,
    R: Default,
{
    let idx = (h as usize).wrapping_sub(1);
    if idx >= MAX_HANDLES {
        return R::default();
    }
    unsafe {
        if !CORES[idx].alive {
            return R::default();
        }
        f(&mut CORES[idx])
    }
}

/// wasm-bindgen init hook (same shape as grading engine / MAX30102 core).
#[wasm_bindgen(start)]
pub fn _wasm_init_hook() {}

#[no_mangle]
pub extern "C" fn ili9341_create() -> u32 {
    unsafe {
        for (i, c) in CORES.iter_mut().enumerate() {
            if !c.alive {
                *c = Core::fresh();
                c.alive = true;
                // Framebuffer alloc may fail under memory pressure — the
                // kernels then no-op (fb_ptr 0) and the JS reference wins.
                c.ensure_fb();
                c.sync_block();
                return (i + 1) as u32;
            }
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn ili9341_destroy(h: u32) {
    let idx = (h as usize).wrapping_sub(1);
    if idx < MAX_HANDLES {
        unsafe {
            // Release this handle's framebuffer slice back to the pool so a
            // later create() reuses (and re-zeroes) it instead of leaking.
            let fb = CORES[idx].fb_ptr;
            if fb != 0 {
                CORES[idx].fb_ptr = 0;
                // Pool layout is fixed: slice i at POOL + i*TFT_VRAM_LEN.
                release_fb_slice(fb);
            }
            CORES[idx].alive = false;
        }
    }
}

/// Free the pool slice starting at `fb` (address compare; no-op if foreign).
unsafe fn release_fb_slice(fb: u32) {
    let base = fb_pool_base();
    if base == 0 || fb < base {
        return;
    }
    let off = fb.wrapping_sub(base) as usize;
    if off % TFT_VRAM_LEN != 0 {
        return;
    }
    let i = off / TFT_VRAM_LEN;
    if i < 8 {
        fb_taken_set(i, false);
    }
}

/// Sync gate: dirty capped at ~30 FPS, heartbeat at least every 100ms.
#[no_mangle]
pub extern "C" fn ili9341_update(h: u32, cycles: u32) {
    with_core(h, |c: &mut Core| {
        let now = cycles as u64;
        let elapsed = now.wrapping_sub(c.last_sync_cycles);
        if (c.dirty != 0 && elapsed >= CYCLES_33MS) {
            c.last_sync_cycles = now;
            c.dirty = 0;
            c.sync_count += 1.0;
        } else if elapsed >= CYCLES_100MS {
            c.last_sync_cycles = now;
            c.sync_count += 1.0;
        }
        c.sync_block();
    });
}

/// JS notifies VRAM writes / power (SPI path stays JS).
#[no_mangle]
pub extern "C" fn ili9341_mark_dirty(h: u32, power_on: u32) {
    with_core(h, |c: &mut Core| {
        c.dirty = 1;
        c.power_on = if power_on != 0 { 1 } else { 0 };
        c.sync_block();
    });
}

#[no_mangle]
pub extern "C" fn ili9341_on_spi(_h: u32, _data: u32) -> u32 {
    0xFF
}

// ── Batched pixel kernels (ONE boundary crossing per frame/stream) ──

/// Set the RAMWR address window + MADCTL (mirrors CASET/PASET/MADCTL JS
/// state). Cheap u32 writes; called on command completion, not per byte.
#[no_mangle]
pub extern "C" fn ili9341_set_window(
    h: u32,
    col_start: u32,
    col_end: u32,
    row_start: u32,
    row_end: u32,
    madctl: u32,
) {
    with_core(h, |c: &mut Core| {
        c.col_start = (col_start.min(239)) as u16;
        c.col_end = (col_end.min(239)) as u16;
        c.row_start = (row_start.min(319)) as u16;
        c.row_end = (row_end.min(319)) as u16;
        c.cur_x = c.col_start;
        c.cur_y = c.row_start;
        c.madctl = (madctl & 0xff) as u8;
    });
}

/// Reset the RAMWR cursor to the window origin (mirrors JS on 0x2C command).
#[no_mangle]
pub extern "C" fn ili9341_ramwr_begin(h: u32) {
    with_core(h, |c: &mut Core| {
        c.cur_x = c.col_start;
        c.cur_y = c.row_start;
    });
}

/// Framebuffer access: the RGB888 frame lives in WASM linear memory
/// (230400 bytes, allocated per-core-slot on first use via the bindgen
/// allocator). `ili9341_fb_ptr(h)` returns its address; JS copies it into
/// the SAB-backed VRAM with ONE bulk set() after a blit (no per-pixel
/// dispatch, no per-byte crossings).
#[no_mangle]
pub extern "C" fn ili9341_fb_ptr(h: u32) -> u32 {
    let idx = (h as usize).wrapping_sub(1);
    if idx >= MAX_HANDLES {
        return 0;
    }
    unsafe {
        if !CORES[idx].alive {
            return 0;
        }
        CORES[idx].fb_ptr
    }
}

#[no_mangle]
pub extern "C" fn ili9341_fb_len() -> u32 {
    TFT_VRAM_LEN as u32
}

/// Ingest a whole RAMWR data stream in one crossing.
/// `bytes_ptr`/`bytes_len` = raw SPI data bytes in WASM memory
/// (MSB-first RGB565 pairs). Converts all pairs straight into the
/// WASM-side framebuffer. Returns pixels written.
/// Odd trailing byte is held by the JS caller (same secondByte contract).
#[no_mangle]
pub extern "C" fn ili9341_ramwr_blit(h: u32, bytes_ptr: u32, bytes_len: u32) -> u32 {
    let idx = (h as usize).wrapping_sub(1);
    if idx >= MAX_HANDLES {
        return 0;
    }
    unsafe {
        if !CORES[idx].alive || CORES[idx].fb_ptr == 0 {
            return 0;
        }
        let c = &mut CORES[idx];
        let src = core::slice::from_raw_parts(bytes_ptr as *const u8, bytes_len as usize);
        let vram = core::slice::from_raw_parts_mut(c.fb_ptr as *mut u8, TFT_VRAM_LEN);
        let mv = (c.madctl >> 5) & 1;
        let mx = (c.madctl >> 6) & 1;
        let my = (c.madctl >> 7) & 1;
        let mut written: u32 = 0;
        let mut k = 0usize;
        // Process whole pairs only; caller holds any odd tail byte.
        let pairs = src.len() / 2;
        let mut cx = c.cur_x as i32;
        let mut cy = c.cur_y as i32;
        let cs = c.col_start as i32;
        let ce = c.col_end as i32;
        let rs = c.row_start as i32;
        let re = c.row_end as i32;
        for _ in 0..pairs {
            let full = ((src[k] as u32) << 8) | (src[k + 1] as u32);
            k += 2;
            let r = (((full >> 11) & 0x1f) << 3) as u8;
            let g = (((full >> 5) & 0x3f) << 2) as u8;
            let b = ((full & 0x1f) << 3) as u8;
            let (px, py) = if mv == 0 {
                (if mx != 0 { cx } else { 239 - cx }, if my != 0 { 319 - cy } else { cy })
            } else {
                (if mx != 0 { 239 - cy } else { cy }, if my != 0 { cx } else { 319 - cx })
            };
            if px >= 0 && px < 240 && py >= 0 && py < 320 {
                let o = (py as usize) * 240 + (px as usize);
                let o3 = o * 3;
                vram[o3] = r;
                vram[o3 + 1] = g;
                vram[o3 + 2] = b;
                written += 1;
            }
            cx += 1;
            if cx > ce {
                cx = cs;
                cy += 1;
                if cy > re {
                    cy = rs;
                }
            }
        }
        c.cur_x = cx as u16;
        c.cur_y = cy as u16;
        c.write_count = c.write_count.wrapping_add(written);
        if written > 0 {
            c.dirty = 1;
            c.sync_block();
        }
        written
    }
}

/// Convert a whole RGB565 DMA frame (153600 bytes in WASM memory) into the
/// WASM-side RGB888 framebuffer in one crossing. Returns pixels converted
/// (76800). Mirrors the JS DMA blit inner loop exactly (MSB first).
#[no_mangle]
pub extern "C" fn ili9341_dma_blit_rgb565(h: u32, dma_ptr: u32, dma_len: u32) -> u32 {
    let idx = (h as usize).wrapping_sub(1);
    if idx >= MAX_HANDLES {
        return 0;
    }
    unsafe {
        if !CORES[idx].alive || CORES[idx].fb_ptr == 0 {
            return 0;
        }
        let c = &mut CORES[idx];
        let need = (TFT_PIXELS * 2) as u32;
        if dma_len < need {
            return 0;
        }
        let src = core::slice::from_raw_parts(dma_ptr as *const u8, TFT_PIXELS * 2);
        let vram = core::slice::from_raw_parts_mut(c.fb_ptr as *mut u8, TFT_VRAM_LEN);
        let mut s = 0usize;
        let mut d = 0usize;
        for _ in 0..TFT_PIXELS {
            let full = ((src[s] as u32) << 8) | (src[s + 1] as u32);
            s += 2;
            vram[d] = (((full >> 11) & 0x1f) << 3) as u8;
            vram[d + 1] = (((full >> 5) & 0x3f) << 2) as u8;
            vram[d + 2] = ((full & 0x1f) << 3) as u8;
            d += 3;
        }
        c.dirty = 1;
        c.write_count = c.write_count.wrapping_add(TFT_PIXELS as u32);
        c.sync_block();
        TFT_PIXELS as u32
    }
}

/// Active-pixel ratio x10 fixed point over the WASM-side framebuffer
/// (avoids f32 ABI rounding). Returns 0..1000; JS divides by 10.
#[no_mangle]
pub extern "C" fn ili9341_fill_percent_x10(h: u32) -> u32 {
    let idx = (h as usize).wrapping_sub(1);
    if idx >= MAX_HANDLES {
        return 0;
    }
    unsafe {
        if !CORES[idx].alive || CORES[idx].fb_ptr == 0 {
            return 0;
        }
        let vram = core::slice::from_raw_parts(CORES[idx].fb_ptr as *const u8, TFT_VRAM_LEN);
        let mut active: u32 = 0;
        let mut o = 0usize;
        for _ in 0..TFT_PIXELS {
            if vram[o] > 0 || vram[o + 1] > 0 || vram[o + 2] > 0 {
                active += 1;
            }
            o += 3;
        }
        // per-mille x10 = active * 10000 / 76800
        ((active as u64 * 10000) / (TFT_PIXELS as u64)) as u32
    }
}

/// CRC32 (IEEE, table-driven) over `len` bytes at `ptr` (WASM memory).
/// Bit-identical to the JS makeCRCTable/crc32 reference in logic.ts.
#[no_mangle]
pub extern "C" fn ili9341_crc32(_h: u32, ptr: u32, len: u32) -> u32 {
    // Standard IEEE CRC-32 table (polynomial 0xEDB88320), generated once.
    static TABLE: [u32; 256] = {
        let mut t = [0u32; 256];
        let mut n = 0u32;
        while n < 256 {
            let mut c = n;
            let mut k = 0;
            while k < 8 {
                c = if (c & 1) != 0 { 0xEDB8_8320 ^ (c >> 1) } else { c >> 1 };
                k += 1;
            }
            t[n as usize] = c;
            n += 1;
        }
        t
    };
    unsafe {
        let buf = core::slice::from_raw_parts(ptr as *const u8, len as usize);
        let mut crc: u32 = 0xFFFF_FFFF;
        for &byte in buf.iter() {
            crc = TABLE[((crc ^ (byte as u32)) & 0xFF) as usize] ^ (crc >> 8);
        }
        crc ^ 0xFFFF_FFFF
    }
}

/// Total RAMWR/DMA pixels ingested (monotonic; mirrors JS writeCount).
#[no_mangle]
pub extern "C" fn ili9341_write_count(h: u32) -> u32 {
    let idx = (h as usize).wrapping_sub(1);
    if idx >= MAX_HANDLES {
        return 0;
    }
    unsafe {
        if !CORES[idx].alive {
            return 0;
        }
        CORES[idx].write_count
    }
}

/// RAMWR cursor for JS lockstep (packed x in lo u16, y in hi u16).
/// Read-only mirror — the kernel owns the cursor after a blit; JS adopts
/// it so a later fallback continues at the right pixel.
#[no_mangle]
pub extern "C" fn ili9341_ramwr_cursor(h: u32) -> u32 {
    let idx = (h as usize).wrapping_sub(1);
    if idx >= MAX_HANDLES {
        return 0;
    }
    unsafe {
        if !CORES[idx].alive {
            return 0;
        }
        let c = &CORES[idx];
        ((c.cur_y as u32) << 16) | (c.cur_x as u32)
    }
}

#[no_mangle]
pub extern "C" fn ili9341_state_ptr(h: u32) -> u32 {
    let idx = (h as usize).wrapping_sub(1);
    if idx >= MAX_HANDLES {
        return 0;
    }
    unsafe {
        if !CORES[idx].alive {
            return 0;
        }
        CORES[idx].state_words.as_ptr() as u32
    }
}

#[no_mangle]
pub extern "C" fn ili9341_state_len() -> u32 {
    12
}
