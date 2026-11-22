//! CC1101 WASM protocol core — registers, FIFOs, strobes, state machine,
//! SPI command engine, GDO signaling (C ABI, no JS glue).
//!
//! Faithful port of the JS reference in logic.ts: same strobe set
//! (SRES/SRX/STX/SIDLE/SFRX/SFTX), same TX/RX FIFO burst commands
//! (0x7F/0x3F single, 0xFF/0xBF burst... see below), same state machine,
//! same GDO0-on-RX behaviour, same default radio params (~433MHz 2-FSK).
//!
//! Airwaves stay in JS by design (RadioEnvironment is the shared transport
//! across instances; WASM instances have isolated memories):
//!   - TX: STX with a non-empty TX FIFO latches the payload and raises
//!     `tx_ready` in the state view. The JS wrapper copies it out
//!     (tx_ptr/tx_len), transmits via RadioEnvironment, then calls
//!     tx_consumed().
//!   - RX: JS onRadioPacketReceived forwards payload bytes via radio_rx().
//!     The core applies the RX-state gate and GDO0 itself.
//!   - GDO0: computed in-core (state view); the wrapper drives the pin.
//!
//! Determinism: register/SPI logic only — no clocks, no randomness.
//!
//! Build: cargo build --release --target wasm32-unknown-unknown (in core-rs)
//!   wasm-bindgen --target web --out-dir ../core \
//!     ../../../target/wasm32-unknown-unknown/release/cc1101_core.wasm
//! (bindgen emits cc1101_core.js + cc1101_core_bg.wasm, loaded lazily by
//! glue.ts. ABI version 1 — bump WASM_ABI_VERSION alongside.)

use wasm_bindgen::prelude::*;

// Strobes
const STROBE_SRES: u8 = 0x30;
const STROBE_SRX: u8 = 0x34;
const STROBE_STX: u8 = 0x35;
const STROBE_SIDLE: u8 = 0x36;
const STROBE_SFRX: u8 = 0x3A;
const STROBE_SFTX: u8 = 0x3B;

const SINGLE_TX_FIFO: u8 = 0x3F;
const BURST_TX_FIFO: u8 = 0x7F;
const BURST_RX_FIFO: u8 = 0xFF;

const REG_FREQ2: usize = 0x0D;
const REG_FREQ1: usize = 0x0E;
const REG_FREQ0: usize = 0x0F;
const REG_MDMCFG2: usize = 0x12;

const MAX_HANDLES: usize = 8;
const MAX_FIFO: usize = 64;

// State view: i32[8] = {state(0=IDLE,1=RX,2=TX), tx_ready, tx_len,
// rx_count, gdo0, freq_hz_lo32, reserved, reserved}.
const VIEW_LEN: usize = 8;

struct Core {
    alive: bool,
    regs: [u8; 64],
    tx_fifo: [u8; MAX_FIFO],
    tx_fifo_len: u8,
    tx_buf: [u8; MAX_FIFO],
    tx_len: u8,
    tx_ready: u8,
    rx_queue: [[u8; MAX_FIFO]; 4],
    rx_lens: [u8; 4],
    rx_count: u8,
    state_machine: u8, // 0 IDLE, 1 RX, 2 TX
    gdo0: u8,
    cmd: u8,
    cmd_valid: bool,
    byte_index: u8,
    freq_hz: u32,
    view: [u32; VIEW_LEN],
}

impl Core {
    const fn fresh() -> Core {
        Core {
            alive: false,
            // Unset registers read 0xFF (mirrors getRegister() ?? 0xFF).
            regs: [0xFF; 64],
            tx_fifo: [0; MAX_FIFO],
            tx_fifo_len: 0,
            tx_buf: [0; MAX_FIFO],
            tx_len: 0,
            tx_ready: 0,
            rx_queue: [[0; MAX_FIFO]; 4],
            rx_lens: [0; 4],
            rx_count: 0,
            state_machine: 0,
            gdo0: 0,
            cmd: 0,
            cmd_valid: false,
            byte_index: 0,
            freq_hz: 433000000,
            view: [0; VIEW_LEN],
        }
    }

    fn reset_regs(&mut self) {
        self.regs = [0xFF; 64];
        // Defaults to ~433MHz (mirrors JS constructor).
        self.regs[REG_FREQ2] = 0x10;
        self.regs[REG_FREQ1] = 0xA7;
        self.regs[REG_FREQ0] = 0x62;
        // Defaults to 2-FSK.
        self.regs[REG_MDMCFG2] = 0x02;
        self.refresh_freq();
    }

    fn refresh_freq(&mut self) {
        let word = ((self.regs[REG_FREQ2] as u32) << 16)
            | ((self.regs[REG_FREQ1] as u32) << 8)
            | (self.regs[REG_FREQ0] as u32);
        // FXOSC = 26 MHz. Freq = (26e6 / 65536) * FREQ[23:0].
        self.freq_hz = ((26000000u64 * word as u64) / 65536) as u32;
    }

    fn handle_strobe(&mut self, cmd: u8) {
        match cmd {
            STROBE_SRES => {
                self.state_machine = 0;
                self.tx_fifo_len = 0;
                self.rx_count = 0;
                self.rx_lens = [0; 4];
                self.tx_ready = 0;
                self.tx_len = 0;
                self.gdo0 = 0;
            }
            STROBE_SRX => {
                self.state_machine = 1;
            }
            STROBE_STX => {
                self.state_machine = 2;
                self.transmit_fifo();
            }
            STROBE_SIDLE => {
                self.state_machine = 0;
            }
            STROBE_SFRX => {
                self.rx_count = 0;
                self.rx_lens = [0; 4];
                self.gdo0 = 0;
            }
            STROBE_SFTX => {
                self.tx_fifo_len = 0;
            }
            _ => {}
        }
    }

    fn transmit_fifo(&mut self) {
        if self.tx_fifo_len > 0 {
            let n = self.tx_fifo_len as usize;
            self.tx_buf[..n].copy_from_slice(&self.tx_fifo[..n]);
            self.tx_len = n as u8;
            self.tx_ready = 1;
            self.tx_fifo_len = 0;
        }
        // Returns to IDLE after transmit (MCSM1 default, mirrors JS).
        self.state_machine = 0;
    }

    fn sync_view(&mut self) {
        self.view[0] = self.state_machine as u32;
        self.view[1] = self.tx_ready as u32;
        self.view[2] = self.tx_len as u32;
        self.view[3] = self.rx_count as u32;
        self.view[4] = self.gdo0 as u32;
        self.view[5] = self.freq_hz;
        self.view[6] = 0;
        self.view[7] = 0;
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
pub extern "C" fn cc1101_create() -> u32 {
    unsafe {
        for (i, c) in CORES.iter_mut().enumerate() {
            if !c.alive {
                *c = Core::fresh();
                c.alive = true;
                c.reset_regs();
                c.sync_view();
                return (i + 1) as u32;
            }
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn cc1101_destroy(h: u32) {
    let idx = (h as usize).wrapping_sub(1);
    if idx < MAX_HANDLES {
        unsafe {
            CORES[idx].alive = false;
        }
    }
}

/// CS edge: active=1 assert (reset command state), 0 deassert (end frame).
#[no_mangle]
pub extern "C" fn cc1101_cs(h: u32, active: u32) {
    with_core(h, |c: &mut Core| {
        if active != 0 {
            c.cmd_valid = false;
            c.byte_index = 0;
        } else {
            c.cmd_valid = false;
        }
        c.sync_view();
    });
}

/// One SPI byte exchange. Returns the MISO byte.
#[no_mangle]
pub extern "C" fn cc1101_spi(h: u32, byte: u32) -> u32 {
    with_core(h, |c: &mut Core| {
        let b = (byte & 0xFF) as u8;
        if !c.cmd_valid {
            c.cmd = b;
            c.cmd_valid = true;
            c.byte_index = 0;
            // Strobes execute immediately.
            if (0x30..=0x3D).contains(&b) {
                c.handle_strobe(b);
                c.sync_view();
                return 0x0F;
            }
            // FIFO access modes.
            if b == BURST_TX_FIFO || b == SINGLE_TX_FIFO {
                c.cmd = BURST_TX_FIFO;
                c.sync_view();
                return 0x0F;
            }
            if b == BURST_RX_FIFO {
                c.cmd = BURST_RX_FIFO;
                c.sync_view();
                return 0x0F;
            }
            c.sync_view();
            return 0x0F;
        }
        c.byte_index = c.byte_index.wrapping_add(1);
        let idx = c.byte_index;
        // Register write (bit7 clear, not FIFO mode).
        if c.cmd & 0x80 == 0 && c.cmd != BURST_TX_FIFO {
            let reg = (c.cmd & 0x3F) as usize;
            if reg < 64 {
                c.regs[reg] = b;
                if reg == REG_FREQ2 || reg == REG_FREQ1 || reg == REG_FREQ0 {
                    c.refresh_freq();
                }
            }
            c.sync_view();
            return 0;
        }
        // Register read (bit7 set, not RX-FIFO mode).
        if c.cmd & 0x80 != 0 && c.cmd != BURST_RX_FIFO {
            let reg = (c.cmd & 0x3F) as usize;
            let v = if reg < 64 { c.regs[reg] } else { 0xFF };
            c.sync_view();
            // Mirrors `getRegister(reg) || 0` (0x00 stays 0x00, unset 0xFF).
            return v as u32;
        }
        // TX FIFO append.
        if c.cmd == BURST_TX_FIFO {
            if (c.tx_fifo_len as usize) < MAX_FIFO {
                c.tx_fifo[c.tx_fifo_len as usize] = b;
                c.tx_fifo_len += 1;
            }
            c.sync_view();
            return 0x0F;
        }
        // RX FIFO drain.
        if c.cmd == BURST_RX_FIFO {
            if c.rx_count > 0 {
                let i = (idx as usize).wrapping_sub(1);
                let out = if i < c.rx_lens[0] as usize {
                    c.rx_queue[0][i]
                } else {
                    0x00
                };
                if idx == c.rx_lens[0] {
                    for k in 0..(c.rx_count as usize - 1) {
                        c.rx_queue[k] = c.rx_queue[k + 1];
                        c.rx_lens[k] = c.rx_lens[k + 1];
                    }
                    c.rx_count -= 1;
                    if c.rx_count == 0 {
                        c.gdo0 = 0;
                    }
                }
                c.sync_view();
                return out as u32;
            }
            c.sync_view();
            return 0x00;
        }
        c.sync_view();
        0
    })
}

/// Inject an airwave-received payload. Applies the RX-state gate and
/// raises GDO0 — mirrors onRadioPacketReceived.
#[wasm_bindgen]
pub fn cc1101_radio_rx(h: u32, data: &[u8]) {
    with_core(h, |c: &mut Core| {
        if c.state_machine != 1 {
            return;
        }
        if c.rx_count as usize >= 4 {
            return;
        }
        let n = data.len().min(MAX_FIFO);
        if n == 0 {
            return;
        }
        let slot = c.rx_count as usize;
        c.rx_queue[slot][..n].copy_from_slice(&data[..n]);
        c.rx_lens[slot] = n as u8;
        c.rx_count += 1;
        c.gdo0 = 1;
        c.sync_view();
    });
}

/// JS has airwave-transmitted the pending payload: clear the flag.
#[no_mangle]
pub extern "C" fn cc1101_tx_consumed(h: u32) {
    with_core(h, |c: &mut Core| {
        c.tx_ready = 0;
        c.tx_len = 0;
        c.sync_view();
    });
}

/// Pointer to the pending-TX payload bytes (valid tx_len bytes).
#[no_mangle]
pub extern "C" fn cc1101_tx_ptr(h: u32) -> u32 {
    let idx = (h as usize).wrapping_sub(1);
    if idx >= MAX_HANDLES {
        return 0;
    }
    unsafe {
        if !CORES[idx].alive {
            return 0;
        }
        CORES[idx].tx_buf.as_ptr() as u32
    }
}

/// Pointer to the i32[8] state view.
#[no_mangle]
pub extern "C" fn cc1101_state_ptr(h: u32) -> u32 {
    let idx = (h as usize).wrapping_sub(1);
    if idx >= MAX_HANDLES {
        return 0;
    }
    unsafe {
        if !CORES[idx].alive {
            return 0;
        }
        CORES[idx].view.as_ptr() as u32
    }
}

/// Length of the state view in bytes (32).
#[no_mangle]
pub extern "C" fn cc1101_state_len() -> u32 {
    (VIEW_LEN as u32) * 4
}
