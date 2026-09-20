//! ILI9341 WASM core — display-descriptor pacing (C ABI, cycles only).
//!
//! Mirrors the JS reference sync subset: 30 FPS cap (33ms ~= 528000 cycles
//! @16MHz) + 10Hz heartbeat (100ms ~= 1600000 cycles). VRAM (240x320x3)
//! stays in the existing SAB-backed Uint8Array — the core only paces the
//! dirty flag + sync counter.
//! State export: u32[3] = { f32 syncCount, i32 powerOn, i32 dirty }.
//!
//! Build: wasm-pack build core-rs --target web --out-dir ../core

use wasm_bindgen::prelude::*;

const MAX_HANDLES: usize = 8;
const CYCLES_33MS: u64 = 528000;
const CYCLES_100MS: u64 = 1600000;

struct Core {
    alive: bool,
    power_on: i32,
    dirty: i32,
    sync_count: f32,
    last_sync_cycles: u64,
    state_words: [u32; 3],
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
            CORES[idx].alive = false;
        }
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
