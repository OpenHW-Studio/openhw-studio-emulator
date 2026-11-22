//! WS2812 NeoPixel framer WASM core — timing decode + idle latch (C ABI).
//!
//! Bit-exact port of NeoPixelBusFramer.clockEdge() plus the protocol
//! base's 50us idle-timeout latch (neopixel-device.ts):
//!   - stale-idle resync (>50us since last edge): emit buffered frame,
//!     resync without decoding the edge (absorbs takeovers/time jumps).
//!   - transition dedup: same-level repeats are not edges (ignored).
//!   - rising edge after >25us LOW: reset → emit buffered frame.
//!   - falling edge: HIGH-pulse width >= freq*0.5625 cycles is a 1-bit.
//!   - bytes assemble MSB-first; GRB triples pack to 0xRRGGBB.
//!   - poll(): idle-timeout latch for show()-once firmware (no more edges).
//!
//! JS keeps: DIN routing, DMA bypass, CPU-freq detect, UI state.
//! Determinism: integer cycle counts in, float threshold compare in f64
//! (same IEEE754 double semantics as the JS reference).
//!
//! Build: cargo build --release --target wasm32-unknown-unknown (in core-rs)
//!   wasm-bindgen --target web --out-dir ../core \
//!     ../../../target/wasm32-unknown-unknown/release/neopixel_core.wasm
//! (bindgen emits neopixel_core.js + neopixel_core_bg.wasm, loaded lazily
//! by glue. ABI version 1 — bump WASM_ABI_VERSION alongside.)

use wasm_bindgen::prelude::*;

const MAX_HANDLES: usize = 8;
// 512 pixels × 3 bytes GRB buffer; 512 packed u32 pixels out.
const MAX_BUF: usize = 1536;
const MAX_PIXELS: usize = 512;

struct Core {
    alive: bool,
    last_cycle: u64,
    buf: [u8; MAX_BUF],
    buf_len: usize,
    cur_bit: u8,
    cur_byte: u8,
    last_level: i8, // -1 unknown, 0 low, 1 high
    freq_mhz: u32,
    out: [u32; MAX_PIXELS],
    out_len: usize,
}

impl Core {
    const fn fresh() -> Core {
        Core {
            alive: false,
            last_cycle: 0,
            buf: [0; MAX_BUF],
            buf_len: 0,
            cur_bit: 0,
            cur_byte: 0,
            last_level: -1,
            freq_mhz: 16,
            out: [0; MAX_PIXELS],
            out_len: 0,
        }
    }

    /// Pack buffered GRB triples to 0xRRGGBB. Returns true if a frame came out.
    fn pack_locked(&mut self) -> bool {
        if self.buf_len == 0 {
            return false;
        }
        let mut n = 0;
        let mut i = 0;
        // Mirrors packPixels exactly, including trailing partial triples
        // (missing channels read as 0).
        while i < self.buf_len && n < MAX_PIXELS {
            let g = self.buf[i] as u32;
            let r = (if i + 1 < self.buf_len { self.buf[i + 1] } else { 0 }) as u32;
            let b = (if i + 2 < self.buf_len { self.buf[i + 2] } else { 0 }) as u32;
            self.out[n] = (r << 16) | (g << 8) | b;
            n += 1;
            i += 3;
        }
        self.out_len = n;
        self.buf_len = 0;
        true
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

#[wasm_bindgen(start)]
pub fn _wasm_init_hook() {}

#[no_mangle]
pub extern "C" fn neo_create() -> u32 {
    unsafe {
        for (i, c) in CORES.iter_mut().enumerate() {
            if !c.alive {
                *c = Core::fresh();
                c.alive = true;
                return (i + 1) as u32;
            }
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn neo_destroy(h: u32) {
    let idx = (h as usize).wrapping_sub(1);
    if idx < MAX_HANDLES {
        unsafe {
            CORES[idx].alive = false;
        }
    }
}

/// CPU frequency for timing thresholds (MHz). Mirrors cpuFreqMHz detect.
#[no_mangle]
pub extern "C" fn neo_set_freq(h: u32, mhz: u32) {
    with_core(h, |c: &mut Core| {
        c.freq_mhz = mhz.max(1);
    });
}

/// Reset framer state (new frame / show boundary).
#[no_mangle]
pub extern "C" fn neo_reset(h: u32) {
    with_core(h, |c: &mut Core| {
        c.buf_len = 0;
        c.cur_bit = 0;
        c.cur_byte = 0;
        c.out_len = 0;
    });
}

/// One DIN level step. Returns 1 when a complete pixel frame is ready
/// (read it via out_ptr/out_len), else 0.
#[no_mangle]
pub extern "C" fn neo_edge(h: u32, high: u32, cycles: u32) -> u32 {
    with_core(h, |c: &mut Core| {
        let now = cycles as u64;
        let hi = high != 0;
        let freq = c.freq_mhz as u64;
        // Stale-idle resync FIRST (>50us): emit, resync, don't decode.
        if now.wrapping_sub(c.last_cycle) > freq.wrapping_mul(50) {
            let out = c.pack_locked();
            c.cur_bit = 0;
            c.cur_byte = 0;
            c.last_level = if hi { 1 } else { 0 };
            c.last_cycle = now;
            return out as u32;
        }
        // Transition dedup: same-level repeats are not edges.
        if c.last_level != -1 && c.last_level == (if hi { 1 } else { 0 }) {
            return 0;
        }
        c.last_level = if hi { 1 } else { 0 };
        let elapsed = now.wrapping_sub(c.last_cycle);
        c.last_cycle = now;
        if hi {
            // Rising edge: LOW time beyond 25us is a reset.
            if elapsed > freq.wrapping_mul(25) {
                let out = c.pack_locked();
                c.cur_bit = 0;
                c.cur_byte = 0;
                return out as u32;
            }
        } else {
            // Falling edge: HIGH-pulse width decides the bit.
            let bit = if (elapsed as f64) >= (c.freq_mhz as f64) * 0.5625 { 1 } else { 0 };
            c.cur_byte = ((c.cur_byte << 1) | bit) & 0xFF;
            c.cur_bit += 1;
            if c.cur_bit == 8 {
                if c.buf_len < MAX_BUF {
                    c.buf[c.buf_len] = c.cur_byte;
                    c.buf_len += 1;
                }
                c.cur_byte = 0;
                c.cur_bit = 0;
            }
        }
        0
    })
}

/// Idle-timeout latch for show()-once firmware: emit when the line has
/// idled past the 50us reset window. Returns 1 with pixels ready, else 0.
#[no_mangle]
pub extern "C" fn neo_poll(h: u32, cycles: u32) -> u32 {
    with_core(h, |c: &mut Core| {
        if c.buf_len == 0 {
            return 0;
        }
        if (cycles as u64).wrapping_sub(c.last_cycle) > (c.freq_mhz as u64).wrapping_mul(50) {
            return c.pack_locked() as u32;
        }
        0
    })
}

/// Number of packed pixels ready.
#[no_mangle]
pub extern "C" fn neo_out_len(h: u32) -> u32 {
    with_core(h, |c: &mut Core| c.out_len as u32)
}

/// Pointer to the packed 0xRRGGBB pixel array (valid neo_out_len u32s).
#[no_mangle]
pub extern "C" fn neo_out_ptr(h: u32) -> u32 {
    let idx = (h as usize).wrapping_sub(1);
    if idx >= MAX_HANDLES {
        return 0;
    }
    unsafe {
        if !CORES[idx].alive {
            return 0;
        }
        CORES[idx].out.as_ptr() as u32
    }
}
