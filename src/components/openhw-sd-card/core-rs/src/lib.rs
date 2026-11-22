//! SD-card WASM core — activity/SPi-response pacing (C ABI, cycles only).
//!
//! The FAT/block-device emulation stays in JS (littlefs.wasm + JS shim).
//! This core owns the cheap per-byte counters the tick path touches:
//! bytesIn/bytesOut + activity flag with a 120ms decay (1.92M cycles @16MHz,
//! mirroring logic.ts). Response bytes stay JS-owned.
//! State export: u32[3] = { f32 bytesIn, f32 bytesOut, i32 active }.
//!
//! Build: wasm-pack build core-rs --target web --out-dir ../core

use wasm_bindgen::prelude::*;

const MAX_HANDLES: usize = 8;
const CYCLES_120MS: u64 = 1920000;

struct Core {
    alive: bool,
    bytes_in: f32,
    bytes_out: f32,
    active: i32,
    last_activity_cycles: u64,
    state_words: [u32; 3],
}

impl Core {
    const fn fresh() -> Core {
        Core {
            alive: false,
            bytes_in: 0.0,
            bytes_out: 0.0,
            active: 0,
            last_activity_cycles: 0,
            state_words: [0; 3],
        }
    }

    fn sync_block(&mut self) {
        self.state_words[0] = self.bytes_in.to_bits();
        self.state_words[1] = self.bytes_out.to_bits();
        self.state_words[2] = self.active as u32;
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
pub extern "C" fn sdcard_create() -> u32 {
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
pub extern "C" fn sdcard_destroy(h: u32) {
    let idx = (h as usize).wrapping_sub(1);
    if idx < MAX_HANDLES {
        unsafe {
            CORES[idx].alive = false;
        }
    }
}

/// SPI byte event from JS (counts only; response bytes stay JS).
#[no_mangle]
pub extern "C" fn sdcard_on_spi(h: u32, cycles: u32) {
    with_core(h, |c: &mut Core| {
        c.bytes_in += 1.0;
        c.last_activity_cycles = cycles as u64;
        c.active = 1;
        c.sync_block();
    });
}

/// Tick: decay activity after 120ms of SPI silence.
#[no_mangle]
pub extern "C" fn sdcard_update(h: u32, cycles: u32) {
    with_core(h, |c: &mut Core| {
        if c.active != 0
            && (cycles as u64).wrapping_sub(c.last_activity_cycles) >= CYCLES_120MS
        {
            c.active = 0;
        }
        c.sync_block();
    });
}

#[no_mangle]
pub extern "C" fn sdcard_state_ptr(h: u32) -> u32 {
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
pub extern "C" fn sdcard_state_len() -> u32 {
    12
}
