//! SSD1306 WASM core — display-descriptor DSP (C ABI, cycles only).
//!
//! Mirrors the JS reference page-addressing/VRAM-dirty subset:
//!   - `update(handle, cycles)`: 60 FPS gate (266666 cycles @16MHz); when
//!     dirty, bumps updateCount and refreshes the state block.
//!   - I2C command/data ingestion stays in JS (register shadow + 1K VRAM);
//!     the core owns frame pacing + descriptor numerics (dirty/updateCount).
//!   - State export: `state_ptr(handle)` → f32[1] {updateCount} + i32[2]
//!     {displayOn, dirty} packed as u32[3] (12 bytes, like MAX30102).
//!   - Determinism: cycle counts in, no Date.now(), no RNG.
//!
//! Build: wasm-pack build core-rs --target web --out-dir ../core

use wasm_bindgen::prelude::*;

const MAX_HANDLES: usize = 8;
const CYCLES_PER_FRAME: u64 = 266666; // ~60 FPS @16MHz

struct Core {
    alive: bool,
    display_on: i32,
    dirty: i32,
    update_count: f32,
    last_frame_cycles: u64,
    state_words: [u32; 3],
}

impl Core {
    const fn fresh() -> Core {
        Core {
            alive: false,
            display_on: 1,
            dirty: 0,
            update_count: 0.0,
            last_frame_cycles: 0,
            state_words: [0; 3],
        }
    }

    fn sync_block(&mut self) {
        self.state_words[0] = self.update_count.to_bits();
        self.state_words[1] = self.display_on as u32;
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
pub extern "C" fn ssd1306_create() -> u32 {
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
pub extern "C" fn ssd1306_destroy(h: u32) {
    let idx = (h as usize).wrapping_sub(1);
    if idx < MAX_HANDLES {
        unsafe {
            CORES[idx].alive = false;
        }
    }
}

/// Frame gate: mark clean + bump updateCount at most every 266666 cycles.
#[no_mangle]
pub extern "C" fn ssd1306_update(h: u32, cycles: u32) {
    with_core(h, |c: &mut Core| {
        let now = cycles as u64;
        if now.wrapping_sub(c.last_frame_cycles) < CYCLES_PER_FRAME {
            return;
        }
        c.last_frame_cycles = now;
        if c.dirty != 0 {
            c.dirty = 0;
            c.update_count += 1.0;
        }
        c.sync_block();
    });
}

/// JS notifies the core of VRAM writes / display on-off (I2C path stays JS).
#[no_mangle]
pub extern "C" fn ssd1306_mark_dirty(h: u32, display_on: u32) {
    with_core(h, |c: &mut Core| {
        c.dirty = 1;
        c.display_on = if display_on != 0 { 1 } else { 0 };
        c.sync_block();
    });
}

#[no_mangle]
pub extern "C" fn ssd1306_on_i2c(_h: u32, _addr: u32, _data: u32) -> u32 {
    1
}

#[no_mangle]
pub extern "C" fn ssd1306_state_ptr(h: u32) -> u32 {
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
pub extern "C" fn ssd1306_state_len() -> u32 {
    12
}
