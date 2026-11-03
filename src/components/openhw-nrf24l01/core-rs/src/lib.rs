//! nRF24L01+ WASM protocol core — registers, FIFOs, SPI command engine,
//! CE/CS state machine, IRQ computation (C ABI, no JS glue).
//!
//! Faithful port of the JS reference in logic.ts: same register defaults,
//! same command decoding (R/W_REGISTER, R/RX_PAYLOAD, W_TX_PAYLOAD,
//! FLUSH_TX/RX), same STATUS-bit semantics (RX_DR/TX_DS), same 3-level RX
//! FIFO, same RF_CH/RF_SETUP frequency derivation.
//!
//! Airwaves stay in JS by design (RadioEnvironment is the shared transport
//! across instances; WASM instances have isolated memories):
//!   - TX: core latches the payload at CS deassert and raises `tx_ready` in
//!     the state view when CE fires. The JS wrapper copies the payload out
//!     (tx_ptr/tx_len), transmits via RadioEnvironment, then calls
//!     tx_consumed() (sets TX_DS, clears the flag).
//!   - RX: JS onRadioPacketReceived forwards payload bytes via radio_rx().
//!     The core applies the PRX+CE gate, RX FIFO cap, and RX_DR itself.
//!   - IRQ: computed in-core (irq() + state view); the wrapper drives the
//!     physical IRQ pin from the view after each interaction.
//!
//! Determinism: register/SPI/cycle logic only — no clocks, no randomness.
//!
//! Build: cargo build --release --target wasm32-unknown-unknown (in core-rs)
//!   wasm-bindgen --target web --out-dir ../core \
//!     ../../../target/wasm32-unknown-unknown/release/nrf24_core.wasm
//! (bindgen emits nrf24_core.js + nrf24_core_bg.wasm, loaded lazily by
//! glue.ts. ABI version 1 — bump WASM_ABI_VERSION alongside.)

use wasm_bindgen::prelude::*;

// Registers
const REG_CONFIG: usize = 0x00;
const REG_RF_CH: usize = 0x05;
const REG_RF_SETUP: usize = 0x06;
const REG_STATUS: usize = 0x07;

// Commands
const CMD_R_REGISTER: u8 = 0x00;
const CMD_W_REGISTER: u8 = 0x20;
const CMD_R_RX_PAYLOAD: u8 = 0x61;
const CMD_W_TX_PAYLOAD: u8 = 0xA0;
const CMD_FLUSH_TX: u8 = 0xE1;
const CMD_FLUSH_RX: u8 = 0xE2;

const STATUS_RX_DR: u8 = 0x40;
const STATUS_TX_DS: u8 = 0x20;

const MAX_HANDLES: usize = 8;
const MAX_PAYLOAD: usize = 32;

// State view: i32[8] = {status, config, tx_ready, tx_len, rx_count,
// irq_low, freq_hz, bandwidth_hz}. tx payload bytes via tx_ptr/tx_len.
const VIEW_LEN: usize = 8;

struct Core {
    alive: bool,
    regs: [u8; 32],
    tx_buf: [u8; MAX_PAYLOAD],
    tx_len: u8,
    tx_ready: u8,
    rx_fifo: [[u8; MAX_PAYLOAD]; 3],
    rx_lens: [u8; 3],
    rx_count: u8,
    ce_high: bool,
    cmd: u8,
    cmd_valid: bool,
    byte_index: u8,
    payload_buf: [u8; MAX_PAYLOAD],
    payload_len: u8,
    freq_hz: u32,
    bandwidth_hz: u32,
    view: [u32; VIEW_LEN],
}

impl Core {
    const fn fresh() -> Core {
        Core {
            alive: false,
            // Unset registers read 0xFF (mirrors getRegister() ?? 0xFF).
            regs: [0xFF; 32],
            tx_buf: [0; MAX_PAYLOAD],
            tx_len: 0,
            tx_ready: 0,
            rx_fifo: [[0; MAX_PAYLOAD]; 3],
            rx_lens: [0; 3],
            rx_count: 0,
            ce_high: false,
            cmd: 0,
            cmd_valid: false,
            byte_index: 0,
            payload_buf: [0; MAX_PAYLOAD],
            payload_len: 0,
            freq_hz: 2402000000,
            bandwidth_hz: 2000000,
            view: [0; VIEW_LEN],
        }
    }

    fn reset_regs(&mut self) {
        // Unset registers read 0xFF (mirrors getRegister() ?? 0xFF).
        self.regs = [0xFF; 32];
        self.regs[REG_CONFIG] = 0x08;
        self.regs[0x01] = 0x3F; // EN_AA
        self.regs[0x02] = 0x03; // EN_RXADDR
        self.regs[0x03] = 0x03; // SETUP_AW
        self.regs[0x04] = 0x03; // SETUP_RETR
        self.regs[REG_RF_CH] = 0x02;
        self.regs[REG_RF_SETUP] = 0x0E;
        self.regs[REG_STATUS] = 0x0E;
        self.regs[0x11] = 0x00; // RX_PW_P0
        self.regs[0x17] = 0x11; // FIFO_STATUS
        self.refresh_freq();
    }

    fn refresh_freq(&mut self) {
        let ch = (self.regs[REG_RF_CH] & 0x7F) as u32;
        self.freq_hz = 2400000000u32.wrapping_add(ch.wrapping_mul(1000000));
        // Data rate from RF_SETUP (mirrors updateRadioParams).
        let rf_setup = self.regs[REG_RF_SETUP];
        let data_rate = if rf_setup & 0x20 != 0 {
            250000
        } else if rf_setup & 0x08 != 0 {
            2000000
        } else {
            1000000
        };
        self.bandwidth_hz = if data_rate > 1000000 { 2000000 } else { 1000000 };
    }

    fn irq_low(&self) -> u32 {
        let status = self.regs[REG_STATUS];
        let config = self.regs[REG_CONFIG];
        let rx = (status & STATUS_RX_DR) != 0 && (config & STATUS_RX_DR) == 0;
        let tx = (status & STATUS_TX_DS) != 0 && (config & STATUS_TX_DS) == 0;
        let rt = (status & 0x10) != 0 && (config & 0x10) == 0;
        if rx || tx || rt { 1 } else { 0 }
    }

    fn sync_view(&mut self) {
        let irq = self.irq_low();
        self.view[0] = self.regs[REG_STATUS] as u32;
        self.view[1] = self.regs[REG_CONFIG] as u32;
        self.view[2] = self.tx_ready as u32;
        self.view[3] = self.tx_len as u32;
        self.view[4] = self.rx_count as u32;
        self.view[5] = irq;
        self.view[6] = self.freq_hz;
        self.view[7] = self.bandwidth_hz;
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
pub extern "C" fn nrf24_create() -> u32 {
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
pub extern "C" fn nrf24_destroy(h: u32) {
    let idx = (h as usize).wrapping_sub(1);
    if idx < MAX_HANDLES {
        unsafe {
            CORES[idx].alive = false;
        }
    }
}

/// CS edge: active=1 assert (reset command state), 0 deassert (latch frame).
#[no_mangle]
pub extern "C" fn nrf24_cs(h: u32, active: u32) {
    with_core(h, |c: &mut Core| {
        if active != 0 {
            c.cmd_valid = false;
            c.byte_index = 0;
            c.payload_len = 0;
        } else if c.cmd_valid && c.cmd == CMD_W_TX_PAYLOAD && c.payload_len > 0 {
            // Latch payload for transmit (mirrors onCSDeassert queueing).
            let n = c.payload_len.min(MAX_PAYLOAD as u8) as usize;
            c.tx_buf[..n].copy_from_slice(&c.payload_buf[..n]);
            c.tx_len = n as u8;
            c.tx_ready = 0; // armed on CE, like checkTx gating
            c.payload_len = 0;
            // NOTE: tx becomes transmittable immediately if CE already high
            // (mirrors `if (this.ceHigh) this.checkTx()` in onCSDeassert).
            if c.ce_high {
                c.tx_ready = 1;
            }
        }
        if !c.cmd_valid {
            // bare CS pulse with no command: nothing latched
        }
        c.cmd_valid = false;
        c.sync_view();
    });
}

/// CE edge. Returns irq_low after handling.
#[no_mangle]
pub extern "C" fn nrf24_ce(h: u32, high: u32) -> u32 {
    with_core(h, |c: &mut Core| {
        c.ce_high = high != 0;
        if c.ce_high && c.tx_len > 0 {
            c.tx_ready = 1;
        }
        c.sync_view();
        c.view[5]
    })
}

/// One SPI byte exchange. Returns the MISO byte.
#[no_mangle]
pub extern "C" fn nrf24_spi(h: u32, byte: u32) -> u32 {
    with_core(h, |c: &mut Core| {
        let b = (byte & 0xFF) as u8;
        if !c.cmd_valid {
            c.cmd = b;
            c.cmd_valid = true;
            c.byte_index = 0;
            if c.cmd == CMD_FLUSH_TX {
                c.tx_len = 0;
                c.tx_ready = 0;
            }
            if c.cmd == CMD_FLUSH_RX {
                c.rx_count = 0;
                c.rx_lens = [0; 3];
            }
            c.sync_view();
            return c.regs[REG_STATUS] as u32;
        }
        c.byte_index = c.byte_index.wrapping_add(1);
        let idx = c.byte_index;
        let out: u8;
        let masked = c.cmd & 0xE0;
        if masked == CMD_R_REGISTER {
            let reg = ((c.cmd & 0x1F) as usize + (idx as usize).wrapping_sub(1)) % 32;
            out = c.regs[reg];
        } else if masked == CMD_W_REGISTER {
            let reg = (c.cmd & 0x1F) as usize % 32;
            c.regs[reg] = b;
            if reg == REG_RF_CH || reg == REG_RF_SETUP {
                c.refresh_freq();
            }
            out = 0x00;
        } else if c.cmd == CMD_W_TX_PAYLOAD {
            if (c.payload_len as usize) < MAX_PAYLOAD {
                c.payload_buf[c.payload_len as usize] = b;
                c.payload_len += 1;
            }
            out = 0x00;
        } else if c.cmd == CMD_R_RX_PAYLOAD {
            if c.rx_count > 0 {
                let i = (idx as usize).wrapping_sub(1);
                out = if i < c.rx_lens[0] as usize { c.rx_fifo[0][i] } else { 0x00 };
                if idx == c.rx_lens[0] {
                    // Whole payload clocked out: pop FIFO.
                    if c.rx_count > 0 {
                        for k in 0..(c.rx_count as usize - 1) {
                            c.rx_fifo[k] = c.rx_fifo[k + 1];
                            c.rx_lens[k] = c.rx_lens[k + 1];
                        }
                        c.rx_count -= 1;
                    }
                }
            } else {
                out = 0x00;
            }
        } else {
            out = 0x00;
        }
        c.sync_view();
        out as u32
    })
}

/// Inject an airwave-received payload. Applies PRX+CE gate, 3-level FIFO
/// cap, and RX_DR — mirrors onRadioPacketReceived.
#[wasm_bindgen]
pub fn nrf24_radio_rx(h: u32, data: &[u8]) {
    with_core(h, |c: &mut Core| {
        let config = c.regs[REG_CONFIG];
        if (config & 0x01) == 0 || !c.ce_high {
            return;
        }
        if c.rx_count as usize >= 3 {
            return;
        }
        let n = data.len().min(MAX_PAYLOAD);
        if n == 0 {
            return;
        }
        let slot = c.rx_count as usize;
        c.rx_fifo[slot][..n].copy_from_slice(&data[..n]);
        c.rx_lens[slot] = n as u8;
        c.rx_count += 1;
        c.regs[REG_STATUS] |= STATUS_RX_DR;
        c.sync_view();
    });
}

/// JS has airwave-transmitted the pending payload: set TX_DS, clear flags.
#[no_mangle]
pub extern "C" fn nrf24_tx_consumed(h: u32) {
    with_core(h, |c: &mut Core| {
        c.regs[REG_STATUS] |= STATUS_TX_DS;
        c.tx_ready = 0;
        c.tx_len = 0;
        c.sync_view();
    });
}

/// Pointer to the pending-TX payload bytes (valid tx_len bytes).
#[no_mangle]
pub extern "C" fn nrf24_tx_ptr(h: u32) -> u32 {
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

/// Current IRQ level (1 = asserted active-low).
#[no_mangle]
pub extern "C" fn nrf24_irq(h: u32) -> u32 {
    with_core(h, |c: &mut Core| {
        let v = c.irq_low();
        c.sync_view();
        v
    })
}

/// Pointer to the i32[8] state view.
#[no_mangle]
pub extern "C" fn nrf24_state_ptr(h: u32) -> u32 {
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
pub extern "C" fn nrf24_state_len() -> u32 {
    (VIEW_LEN as u32) * 4
}
