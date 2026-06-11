import { BaseComponent } from '../BaseComponent';
import type { WiFiConnectionStatus } from '../../protocol-handlers/wifi-environment';
import { Cyw43Emulator } from './cyw43/Cyw43Emulator';
import { PioBusSniffer } from './cyw43/PioBusSniffer';

function normalizePicoPin(pinId: string): string {
  const s = String(pinId || '').toUpperCase();
  if (/^GPIO\d+$/.test(s)) return `GP${s.slice(4)}`;
  if (/^D\d+$/.test(s)) return `GP${s.slice(1)}`;
  if (/^\d+$/.test(s)) return `GP${s}`;
  return s;
}

export class PicoWLogic extends BaseComponent {
  private txTimeout: any = null;
  private rxTimeout: any = null;
  private ws: WebSocket | null = null;
  private isWsOpen = false;

  public cyw43: Cyw43Emulator | null = null;
  public cyw43Sniffer: PioBusSniffer | null = null;
  private cyw43RxQueue: number[] = [];
  private cyw43HookedFifos: Array<{ restore: () => void }> = [];

  constructor(id: string, manifest: any) {
    super(id, manifest);
    this.cyw43 = new Cyw43Emulator();
    this.cyw43Sniffer = new PioBusSniffer();
    this.state = {
      txActive:       false,
      rxActive:       false,
      builtInLed:     false,
      wirelessStatus: 'idle' as WiFiConnectionStatus,
      wifiConnected:  false,
      wifiSsid:       '',
      wifiIp:         '',
      wifiPacketCount: 0,
      ...this.state,
    };
  }

  // ── Simulation lifecycle ─────────────────────────────────────────────────────

  override onSimulationStart(): void {
    const wirelessMode = String(this.attrs?.wirelessMode ?? 'full');
    const wifiEnabled  = wirelessMode !== 'off';
    const ssid         = String(this.attrs?.wirelessSsid    ?? '');
    const sessionId    = String(this.attrs?.sessionId       ?? '');

    if (!wifiEnabled) return;

    if (this.cyw43) {
      this.cyw43.onLed((ev) => {
          console.log(`[PicoW] CYW43 LED = ${ev.on}`);
          this.setState({ builtInLed: ev.on });
      });
      this.cyw43.onConnect((ev) => {
          console.log(`[PicoW] CYW43 Connected to SSID: ${ev.ssid}`);
          this.setState({ wirelessStatus: 'connected', wirelessSsid: ev.ssid });
      });
      this.cyw43.onPacketOut((ev) => {
          if (!this.isWsOpen || !this.ws) return;
          console.log(`[PicoW TX] Ethernet frame out (len=${ev.ether.length}) -> Gateway`);
          this.setState({ wirelessPacketCount: (this.state.wirelessPacketCount || 0) + 1 });
          this.ws.send(ev.ether.buffer);
      });
    }

    this.setState({ wirelessStatus: 'connecting', wirelessSsid: ssid });

    let url = 'ws://localhost:5099/api/network-gateway';
    if (sessionId) url += `?sessionId=${sessionId}`;

    try {
      this.ws = new WebSocket(url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        console.log(`[PicoW] Connected to Private Go Gateway: ${url}`);
        this.isWsOpen = true;
      };

      this.ws.onclose = () => {
        console.log(`[PicoW] Disconnected from Gateway`);
        this.isWsOpen = false;
        this.setState({ wirelessStatus: 'idle', wifiConnected: false });
      };

      this.ws.onerror = (e) => {
        console.error(`[PicoW] WebSocket Error:`, e);
      };

      this.ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          const frame = new Uint8Array(event.data);
          console.log(`[PicoW RX] Ethernet frame in (len=${frame.length}) <- Gateway`);
          if (this.cyw43) {
            this.cyw43.injectPacket(frame);
          }
          this._sniffDhcpAck(frame);
        }
      };
    } catch (e) {
      console.error(`[PicoW] Failed to connect to gateway:`, e);
    }
  }

  override onSimulationStop(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isWsOpen = false;
    
    for (const h of this.cyw43HookedFifos) h.restore();
    this.cyw43HookedFifos = [];
    this.cyw43RxQueue = [];
    this.cyw43 = null;
    this.cyw43Sniffer = null;

    this.setState({
      wirelessStatus:  'idle',
      wifiConnected:   false,
      wifiSsid:        '',
      wifiIp:          '',
      wifiPacketCount: 0,
    });
  }

  // ── CYW43439 SPI Hooks ───────────────────────────────────────────────────────

  attachPioHooks(rp2040: any): void {
    if (!rp2040 || !this.cyw43 || !this.cyw43Sniffer) return;

    const pios: any[] = rp2040.pio;
    let hookedCount = 0;
    let pioIndex = -1;

    // Log UART to catch panics!
    const hookUart = (uart: any, name: string) => {
      if (uart) {
        let buffer = '';
        uart.onByte = (byte: number) => {
          const char = String.fromCharCode(byte);
          if (char === '\n') {
            console.log(`[PicoW ${name}] ${buffer}`);
            buffer = '';
          } else if (char !== '\r') {
            buffer += char;
          }
        };
      }
    };
    hookUart(rp2040.uart[0], 'UART0');
    hookUart(rp2040.uart[1], 'UART1');

    for (const pio of pios) {
      pioIndex++;

      if (!(pio as any).__shiftCtrlHooked) {
        const origPioWrite = pio.writeUint32.bind(pio);
        pio.writeUint32 = (offset: number, value: number) => {
          origPioWrite(offset, value);
          // SHIFTCTRL register offsets for each SM: 0xd0, 0xe8, 0x100, 0x118
          // pio_sm_clear_fifos toggles FJOIN_RX — rp2040js doesn't auto-clear, so we do it.
          const smIdx = offset === 0xd0 ? 0 : offset === 0xe8 ? 1 : offset === 0x100 ? 2 : offset === 0x118 ? 3 : -1;
          if (smIdx >= 0) {
            const sm = pio.machines[smIdx];
            for (const fifo of [sm.rxFIFO, sm.txFIFO]) {
              if (!fifo) continue;
              if (typeof fifo.clear === 'function') fifo.clear();
              else { (fifo as any).used = 0; (fifo as any).start = 0; }
            }
            if (this.cyw43Sniffer) this.cyw43Sniffer.reset();
            this.cyw43RxQueue = [];
          }
        };
        (pio as any).__shiftCtrlHooked = true;
      }

      for (let machineIndex = 0; machineIndex < pio.machines.length; machineIndex++) {
        const sm = pio.machines[machineIndex];
        const tx = sm.txFIFO;
        if (!tx) continue;
        const smLabel = `PIO${pioIndex} SM${machineIndex}`;

        console.log(`[PicoW] CYW43 Emulator attached to ${smLabel}.`);

        const origTxPush = tx.push.bind(tx);
        tx.push = (value: number) => {
          // Feed every TX FIFO push to the gSPI sniffer (Velxio pattern).
          // swap16x2 is applied unconditionally inside feedWord.
          for (const ev of this.cyw43Sniffer!.feedWord(value)) {
            if (ev.kind === 'header' && ev.cmd.length > 0) {
              const fn = ['F0', 'F1', 'F2', 'F3'][ev.cmd.function];
              console.log(`[PicoW SPI] ${smLabel} ${ev.cmd.write ? 'WR' : 'RD'} ${fn} Addr=0x${ev.cmd.address.toString(16)} Len=${ev.cmd.length} q=${this.cyw43RxQueue.length}`);
              if (!ev.cmd.write) {
                const leadDummyWords = ev.cmd.function === 1 ? 4 : 1;
                const reply = this.cyw43!.onCommand(ev.cmd, new Uint8Array(0));
                if (reply && reply.length > 0) {
                  console.log(`[PicoW SPI RX] ${smLabel} ${fn} Addr=0x${ev.cmd.address.toString(16)} reply ${reply.length}B leadDummy=${leadDummyWords}: [ ${Array.from(reply.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ')}${reply.length > 8 ? '...' : ''} ]`);
                  this._queueCyw43Reply(reply, leadDummyWords);
                  console.log(`[PicoW SPI RXQ] ${smLabel} queued=${this.cyw43RxQueue.length} words`);
                }
              }
            } else if (ev.kind === 'payload') {
              if (ev.cmd.write && ev.payload.length > 0) {
                console.log(`[PicoW SPI TX] ${smLabel} ${['F0','F1','F2','F3'][ev.cmd.function]} Addr=0x${ev.cmd.address.toString(16)} ${ev.payload.length}B: [ ${Array.from(ev.payload.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')}${ev.payload.length > 16 ? '...' : ''} ]`);
                const reply = this.cyw43!.onCommand(ev.cmd, ev.payload);
                if (reply && reply.length > 0) {
                  console.log(`[PicoW SPI RX] ${smLabel} ${['F0','F1','F2','F3'][ev.cmd.function]} Addr=0x${ev.cmd.address.toString(16)} reply ${reply.length}B: [ ${Array.from(reply.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ')}${reply.length > 8 ? '...' : ''} ]`);
                  this._queueCyw43Reply(reply, 0);
                  console.log(`[PicoW SPI RXQ] ${smLabel} queued=${this.cyw43RxQueue.length} words`);
                }
              }
            }
          }
          // Drain any queued reply words into rxFIFOs (Velxio pattern).
          this._drainCyw43Rx(sm, smLabel);
          return origTxPush(value);
        };

        this.cyw43HookedFifos.push({ restore: () => { tx.push = origTxPush; } });
        hookedCount++;
      }
    }
    console.log(`[PicoW] CYW43 Emulator hooked ${hookedCount} PIO state machines.`);
  }

  private _queueCyw43Reply(reply: Uint8Array, leadDummyWords = 0): void {
    for (let i = 0; i < leadDummyWords; i++) {
      this.cyw43RxQueue.push(0);
    }
    for (let i = 0; i + 4 <= reply.length; i += 4) {
      const w = ((reply[i + 3] << 24) | (reply[i + 2] << 16) | (reply[i + 1] << 8) | reply[i]) >>> 0;
      this.cyw43RxQueue.push(w);
    }
    if (reply.length % 4 !== 0) {
      const tail = reply.subarray(reply.length - (reply.length % 4));
      let w = 0;
      for (let i = 0; i < tail.length; i++) w |= tail[i] << (i * 8);
      this.cyw43RxQueue.push(w >>> 0);
    }
  }

  private _drainCyw43Rx(sm: any, smLabel = 'unknown-sm', maxWords = Number.POSITIVE_INFINITY): void {
    if (this.cyw43RxQueue.length === 0) return;
    const rx = sm?.rxFIFO;
    if (!rx) return;

    let drained = 0;
    while (this.cyw43RxQueue.length > 0 && !rx.full && drained < maxWords) {
      rx.push(this.cyw43RxQueue.shift()!);
      drained++;
    }

    if (drained > 0 || this.cyw43RxQueue.length > 0) {
      console.log(`[PicoW SPI RXQ] ${smLabel} drained=${drained} remaining=${this.cyw43RxQueue.length} rxFull=${!!rx.full}`);
    }
  }

  // ── Frame handling ────────────────────────────────────────────────────────────


  /**
   * Sniff incoming packets for DHCP ACK to extract the assigned IP address.
   */
  private _sniffDhcpAck(frame: Uint8Array): void {
    if (frame.length < 300) return; // Too small for DHCP
    
    // Check if it's IPv4 (EtherType 0x0800)
    if (frame[12] !== 0x08 || frame[13] !== 0x00) return;
    
    // IP Header Length
    const ipHeaderLen = (frame[14] & 0x0F) * 4;
    
    // Protocol (17 = UDP)
    if (frame[23] !== 17) return;
    
    const udpOffset = 14 + ipHeaderLen;
    // DHCP Server Port = 67, Client Port = 68
    const srcPort = (frame[udpOffset] << 8) | frame[udpOffset + 1];
    const dstPort = (frame[udpOffset + 2] << 8) | frame[udpOffset + 3];
    
    if (srcPort === 67 && dstPort === 68) {
      const dhcpOffset = udpOffset + 8; // Skip UDP header
      // op = 2 (BootReply)
      if (frame[dhcpOffset] === 2) {
        // Extract yiaddr (Your IP Address) at offset 16 from DHCP header
        const ipOffset = dhcpOffset + 16;
        const ipStr = `${frame[ipOffset]}.${frame[ipOffset + 1]}.${frame[ipOffset + 2]}.${frame[ipOffset + 3]}`;
        
        if (ipStr !== "0.0.0.0") {
           this.setState({
             wirelessStatus: 'got_ip',
             wirelessConnected: true,
             wirelessIp: ipStr
           });
           console.log(`[PicoW] Sniffed DHCP ACK! Assigned IP: ${ipStr}`);
        }
      }
    }
  }

  /** Download the PCAP capture (browser only). Async — network worker sends PCAP_DATA back. */
  downloadPcap(): void {
    console.warn(`[PicoW] PCAP download on frontend is delegated to backend or requires PcapWriter.`);
  }

  // ── GPIO / UART ───────────────────────────────────────────────────────────────

  onPinStateChange(pinId: string, isHigh: boolean, _cpuCycles: number) {
    const pin = normalizePicoPin(pinId);
    if (pin === 'GP1' || pin === 'GP5') {
      this.setState({ rxActive: true });
      if (this.rxTimeout) clearTimeout(this.rxTimeout);
      this.rxTimeout = setTimeout(() => { this.setState({ rxActive: false }); this.rxTimeout = null; }, 100);
    } else if (pin === 'GP0' || pin === 'GP4') {
      this.setState({ txActive: true });
      if (this.txTimeout) clearTimeout(this.txTimeout);
      this.txTimeout = setTimeout(() => { this.setState({ txActive: false }); this.txTimeout = null; }, 100);
    } else if (pin === 'GP23') {
      const wasHigh = (this as any)._lastGp23High !== false;
      (this as any)._lastGp23High = isHigh;
      // Reset sniffer on falling edge (chip reset by host)
      if (!isHigh && wasHigh) {
        console.log(`[PicoW] WL_REG_ON falling edge — resetting CYW43 sniffer.`);
        if (this.cyw43Sniffer) this.cyw43Sniffer.reset();
        this.cyw43RxQueue = [];
      }
    } else if (pin === 'GP25') {
      // The simulator UI still hooks GPIO25 for regular Pico. We can keep it or override with cyw43.onLed.
      // If cyw43 is active, builtInLed is driven by cyw43.
      if (!this.cyw43) {
        this.setState({ builtInLed: !!isHigh });
      }
    }
  }

  update(_cpuCycles: number, _currentWires: any[], _allComponentsInstances: BaseComponent[]) {
    // Runtime CPU integration for RP2040 is handled in worker runners.
  }
}
