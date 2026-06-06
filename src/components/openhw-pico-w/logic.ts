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

    // Helper to simulate DMA bswap (reverses 4 bytes)
    const bswap = (val: number) => {
      return (((val & 0xff) << 24) |
             ((val & 0xff00) << 8) |
             ((val >>> 8) & 0xff00) |
             ((val >>> 24) & 0xff)) >>> 0;
    };
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
            // In rp2040js, SHIFTCTRL is at 0xd0, 0xe8, 0x100, 0x118.
            // pio_sm_clear_fifos toggles FJOIN_RX via XOR alias, which resolves to the base offset here.
            // Since rp2040js doesn't clear FIFOs on FJOIN_RX toggle, we must do it manually!
            const smIdx = offset === 0xd0 ? 0 : offset === 0xe8 ? 1 : offset === 0x100 ? 2 : offset === 0x118 ? 3 : -1;
            if (smIdx >= 0) {
              // console.log(`[PicoW DEBUG] PIO${pioIndex} SM${smIdx} SHIFTCTRL write, clearing FIFOs!`);
              if (pio.machines[smIdx].rxFIFO) {
                if (typeof pio.machines[smIdx].rxFIFO.clear === 'function') {
                    pio.machines[smIdx].rxFIFO.clear();
                } else {
                    (pio.machines[smIdx].rxFIFO as any).used = 0;
                    (pio.machines[smIdx].rxFIFO as any).start = 0;
                }
              }
              if (pio.machines[smIdx].txFIFO) {
                if (typeof pio.machines[smIdx].txFIFO.clear === 'function') {
                    pio.machines[smIdx].txFIFO.clear();
                } else {
                    (pio.machines[smIdx].txFIFO as any).used = 0;
                    (pio.machines[smIdx].txFIFO as any).start = 0;
                }
              }
              // Also reset our sniffer state just in case
              if (this.cyw43Sniffer) {
                this.cyw43Sniffer.state = 'bitcount1';
              }
              this.cyw43RxQueue = [];
            }
          };
          (pio as any).__shiftCtrlHooked = true;
        }

        for (let machineIndex = 0; machineIndex < pio.machines.length; machineIndex++) {
        const sm = pio.machines[machineIndex];
        const tx = sm.txFIFO;
        const rx = sm.rxFIFO;
        if (!tx || !rx) continue;

        // Exclude SD SPI if we can identify it, but for now just hook all to be safe!
        // We will just let the sniffer handle all data.
        // if (pioIndex === 1 && machineIndex === 0) continue;

        console.log(`[PicoW] CYW43 Emulator attached to PIO${pioIndex} state machine ${machineIndex}.`);
        
        const currentPioIndex = pioIndex; // capture properly for closure
        const currentSmIndex = machineIndex;
        setInterval(() => {
          const inst = pio.instructions[sm.pc] !== undefined ? pio.instructions[sm.pc].toString(16).padStart(4, '0') : '????';
          if (sm.txFIFO.itemCount > 0 || sm.rxFIFO.itemCount > 0 || sm.pc > 0) {
            console.log(`[PicoW DEBUG Ticker] PIO${currentPioIndex} SM${currentSmIndex} PC=${sm.pc} Inst=${inst} Wait=${sm.waiting} x=${sm.x} y=${sm.y} TX=${sm.txFIFO.itemCount} RX=${sm.rxFIFO.itemCount} ISR=${sm.inputShiftReg.toString(16)}`);
          }
        }, 1000);

        const hookTx = (txObj: any) => {
          if (!txObj || txObj.__hooked) return;
          const origTxPull = txObj.pull.bind(txObj);
          const origTxPush = txObj.push.bind(txObj);
          
          txObj.push = (value: number) => {
            console.log(`[PicoW DEBUG] PIO${currentPioIndex} SM${currentSmIndex} txFIFO.push: 0x${value.toString(16).padStart(8, '0')}`);
            return origTxPush(value);
          };
          
          txObj.pull = () => {
            const val = origTxPull();
            if (val !== undefined && val !== null) {
              for (const ev of this.cyw43Sniffer!.feedWord(val)) {
                if (ev.kind === 'header') {
                  const cmdName = ev.cmd.function === 0 ? 'F0' : ev.cmd.function === 1 ? 'F1' : 'F2';
                  console.log(`[PicoW SPI TX] PIO${currentPioIndex} SM${currentSmIndex} ${cmdName} Addr=0x${ev.cmd.address.toString(16)} Len=${ev.cmd.length} Write=${ev.cmd.write}`);
                } else if (ev.kind === 'payload') {
                  if (ev.cmd.write) {
                    console.log(`[PicoW SPI TX] Payload ${ev.payload.length} bytes: [ ${Array.from(ev.payload).map(b => b.toString(16).padStart(2, '0')).join(' ')} ]`);
                  }
                  const reply = this.cyw43!.onCommand(ev.cmd, ev.cmd.write ? ev.payload : undefined);
                  if (reply && reply.length > 0) {
                    console.log(`[PicoW SPI RX] Replying ${reply.length} bytes: [ ${Array.from(reply).map(b => b.toString(16).padStart(2, '0')).join(' ')} ]`);
                    // We need to push words to RX FIFO
                    const paddedLen = Math.ceil(reply.length / 4) * 4;
                    const buf = new Uint8Array(paddedLen);
                    buf.set(reply);
                    const view = new DataView(buf.buffer);
                    for (let i = 0; i < buf.length; i += 4) {
                      const word = view.getUint32(i, true); // little endian
                      this.cyw43RxQueue.push(word);
                    }
                  }
                }
              }

              // HACK: Workaround for rp2040js timing bug!
              if (this.cyw43Sniffer!.state === 'bitcount2') {
                  (this as any)._interceptedBitcount1 = val;
              } else if (this.cyw43Sniffer!.state === 'command') {
                  sm.x = (this as any)._interceptedBitcount1;
              }
            }
            return val;
          };
          txObj.__hooked = true;
        };

        const hookRx = (rxObj: any) => {
          if (!rxObj || rxObj.__hooked) return;
          const origRxPush: (v: number) => void = rxObj.push.bind(rxObj);
          rxObj.push = (value: number) => {
            if (this.cyw43RxQueue.length > 0) {
              const w = this.cyw43RxQueue.shift()!;
              const outWord = this.cyw43Sniffer!.inBootSwappedMode ? 
                              (((w & 0xffff) << 16) | ((w >>> 16) & 0xffff)) >>> 0 : w;
              return origRxPush(outWord);
            }
            return origRxPush(value);
          };
          rxObj.__hooked = true;
        };

        let currentTx = sm.txFIFO;
        let currentRx = sm.rxFIFO;
        hookTx(currentTx);
        hookRx(currentRx);

        this.cyw43HookedFifos.push({
          restore: () => { /* cannot easily restore safely, ok for emulator lifecycle */ },
        });

        hookedCount++;
      }
    }
    console.log(`[PicoW] CYW43 Emulator hooked ${hookedCount} PIO state machines.`);
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
      if (!isHigh) {
        console.log(`[PicoW] WL_REG_ON is LOW. Resetting CYW43...`);
        if (this.cyw43Sniffer) {
          this.cyw43Sniffer.inBootSwappedMode = true;
          this.cyw43Sniffer.state = 'bitcount1';
        }
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
