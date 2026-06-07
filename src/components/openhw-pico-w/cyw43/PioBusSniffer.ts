/**
 * pio_bus_sniffer
 *
 * Decodes the 32-bit gSPI command words that the cyw43 PIO program
 * shifts out on the Pico W's WL_DATA pin. The PIO program transmits
 * MSB-first in 16-bit halfwords and the driver swaps halfwords before
 * presenting them to the wire — see
 *   pico-sdk/src/rp2_common/pico_cyw43_driver/cyw43_bus_pio_spi.pio
 *
 * This is a **passive** observer. It accepts a stream of 32-bit words
 * coming out of the PIO TX FIFO and reassembles them into typed
 * commands the higher layer can act on.
 *
 * It deliberately does NOT touch the real CYW43 driver source — every
 * constant below is derived from the open spec or open driver code,
 * not from the closed firmware.
 */

export interface Cyw43Cmd {
  /** Raw 32-bit header as transmitted (after PIO halfword swap is undone). */
  rawHeader: number;
  /** 1 = host writing to chip, 0 = chip writing to host. */
  write: boolean;
  /** Address auto-increments inside the function space when set. */
  increment: boolean;
  /** 0 = F0/SPI bus regs, 1 = F1/backplane, 2 = F2/data. */
  function: 0 | 1 | 2 | 3;
  /** 17-bit address inside the chosen function. */
  address: number;
  /** Byte length following the header. 0–2048. */
  length: number;
}

/**
 * Decode a single 32-bit header word into a Cyw43Cmd. The argument is
 * the value already in **host byte order** — caller is responsible for
 * undoing the PIO halfword swap before passing it in.
 */
export function decodeHeader(hdr: number): Cyw43Cmd {
  // Cap to 32 bits — JS numbers are doubles, bitops are 32-bit signed.
  const h = hdr >>> 0;
  return {
    rawHeader: h,
    write: ((h >>> 31) & 1) === 1,
    increment: ((h >>> 30) & 1) === 1,
    function: ((h >>> 28) & 0b11) as 0 | 1 | 2 | 3,
    address: (h >>> 11) & 0x1ffff,
    length: (h & 0x7ff) === 0 ? 2048 : (h & 0x7ff),
  };
}

/**
 * Undo the PIO program's 16-bit halfword swap. The driver computes
 *   wire = ((host_word & 0xffff) << 16) | ((host_word >> 16) & 0xffff)
 * before pushing into the TX FIFO; this reverses it.
 */
export function swap16x2(word: number): number {
  const w = word >>> 0;
  return (((w & 0xffff) << 16) | ((w >>> 16) & 0xffff)) >>> 0;
}

/**
 * The driver shifts data as 32-bit words via PIO `out pins, 1` over
 * 32 cycles per word. This streamer accepts whole 32-bit words pulled
 * off the PIO TX FIFO and yields fully-decoded commands once the
 * trailing payload bytes are present.
 *
 * Usage:
 *
 *   const sniffer = new PioBusSniffer();
 *   for (const word of pioTxFifoStream) {
 *     for (const ev of sniffer.feedWord(word)) {
 *       handle(ev);
 *     }
 *   }
 */
export type SnifferEvent =
  | { kind: 'header'; cmd: Cyw43Cmd }
  | { kind: 'payload'; cmd: Cyw43Cmd; payload: Uint8Array };

export class PioBusSniffer {
  private pendingCmd: Cyw43Cmd | null = null;
  private pendingPayload: number[] = [];
  public state: 'bitcount1' | 'bitcount2' | 'command' | 'payload' = 'bitcount1';
  public inBootSwappedMode = true;

  isExpectingPayload(): boolean {
    return this.state === 'payload';
  }

  isDmaWord(): boolean {
    return this.state === 'command' || this.state === 'payload';
  }

  *feedWord(rawWord: number): Generator<SnifferEvent> {
    if (this.state === 'bitcount1') {
      console.log(`[PicoW SPI Sniffer] bitcount1: ${rawWord}`);
      this.state = 'bitcount2';
      return; // Ignore bitcount
    }
    if (this.state === 'bitcount2') {
      console.log(`[PicoW SPI Sniffer] bitcount2: ${rawWord}`);
      this.state = 'command';
      return; // Ignore bitcount
    }

    // On boot, the C driver applies SWAP32 (which is actually just swap16x2)
    // to the command word. We undo that here so we always get the logical command.
    let word = rawWord;
    if (this.state === 'command' && this.inBootSwappedMode) {
      word = swap16x2(rawWord);
    }
    
    console.log(`[PicoW SPI Sniffer] feedWord: raw=0x${(rawWord >>> 0).toString(16).padStart(8, '0')} decoded=0x${word.toString(16).padStart(8, '0')}`);

    if (this.state === 'command') {
      const cmd = decodeHeader(word);
      this.pendingCmd = cmd;
      this.pendingPayload = [];
      yield { kind: 'header', cmd };

      // Switch out of boot swapped mode once SPI_BUS_CONTROL (0x0) is written
      if (cmd.write && cmd.function === 0 && cmd.address === 0x0) {
        this.inBootSwappedMode = false;
        console.log(`[PicoW SPI Sniffer] Exiting boot swapped mode!`);
      }

      if (cmd.length === 0) {
        // Technically length 0 was converted to 2048, so this won't hit, but for safety:
        yield { kind: 'payload', cmd, payload: new Uint8Array(0) };
        this.pendingCmd = null;
        this.state = 'bitcount1';
      } else if (!cmd.write) {
        // For READs, yield the empty payload immediately so logic can reply,
        // BUT transition to 'payload' state so we consume the dummy TX DMA words!
        yield { kind: 'payload', cmd, payload: new Uint8Array(0) };
        this.state = 'payload';
      } else {
        this.state = 'payload';
      }
      return;
    }

    if (this.state === 'payload') {
      console.log(`[PicoW SPI Sniffer] payload: word=0x${(word >>> 0).toString(16).padStart(8, '0')} pendingPayload.len=${this.pendingPayload.length} cmd.len=${this.pendingCmd!.length}`);
      for (let i = 0; i < 4; i++) {
        this.pendingPayload.push((word >>> (i * 8)) & 0xff);
        if (this.pendingPayload.length >= this.pendingCmd!.length) break;
      }

      if (this.pendingPayload.length >= this.pendingCmd!.length) {
        if (this.pendingCmd!.write) {
          yield { kind: 'payload', cmd: this.pendingCmd!, payload: new Uint8Array(this.pendingPayload) };
        }
        this.pendingCmd = null;
        this.pendingPayload = [];
        this.state = 'bitcount1';
      }
    }
  }
}

/** Pretty-print a command for debug logs. */
export function formatCmd(cmd: Cyw43Cmd): string {
  const dir = cmd.write ? 'WR' : 'RD';
  const fnName = ['F0', 'F1', 'F2', 'F3'][cmd.function];
  const inc = cmd.increment ? '+' : ' ';
  return `${dir} ${fnName}${inc} addr=0x${cmd.address.toString(16).padStart(5, '0')} len=${cmd.length}`;
}
