import { BaseComponent } from '../BaseComponent';
import type { WiFiConnectionStatus } from '../../protocol-handlers/wifi-environment';
import { Cyw43Emulator } from './cyw43/Cyw43Emulator';

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
  private cyw43DrainTimer: any = null;
  private rp2040Ref: any = null;
  private ws: WebSocket | null = null;
  private isWsOpen = false;

  public cyw43: Cyw43Emulator | null = null;
  private cyw43GpioHooks: Array<{ restore: () => void }> = [];

  constructor(id: string, manifest: any) {
    super(id, manifest);
    this.cyw43 = new Cyw43Emulator();
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

  private _getCyw43Sniffer(smLabel: string): PioBusSniffer {
    let sniffer = this.cyw43Sniffers.get(smLabel);
    if (!sniffer) {
      sniffer = new PioBusSniffer();
      this.cyw43Sniffers.set(smLabel, sniffer);
      if (!this.cyw43Sniffer) this.cyw43Sniffer = sniffer;
    }
    return sniffer;
  }

  private _getCyw43Queue(smLabel: string): number[] {
    let queue = this.cyw43RxQueues.get(smLabel);
    if (!queue) {
      queue = [];
      this.cyw43RxQueues.set(smLabel, queue);
    }
    return queue;
  }

  private _resetCyw43BusState(): void {
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
    if (this.cyw43DrainTimer) {
      clearInterval(this.cyw43DrainTimer);
      this.cyw43DrainTimer = null;
    }
    this.rp2040Ref = null;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isWsOpen = false;
    
    for (const h of this.cyw43GpioHooks) h.restore();
    this.cyw43GpioHooks = [];
    this._resetCyw43BusState();
    this.cyw43 = null;

    this.setState({
      wirelessStatus:  'idle',
      wifiConnected:   false,
      wifiSsid:        '',
      wifiIp:          '',
      wifiPacketCount: 0,
    });
  }

  // ── CYW43439 SPI Hooks ───────────────────────────────────────────────────────

  attachGpioHooks(rp2040: any): void {
    if (!rp2040 || !this.cyw43) return;
    this.rp2040Ref = rp2040;

    const WL_D = 24;
    const WL_CS = 25;
    const WL_CLK = 29;

    let isSelected = false;
    let shiftIn = 0;
    let bitCount = 0;
    
    let currentCmd: any | null = null;
    let writePayload = new Uint8Array(0);
    let writeIdx = 0;
    
    let replyData = new Uint32Array(0);
    let replyIdx = 0;
    let shiftOut = 0;

    const transformValue = (x: number) => {
      // Undo the half-word swap the driver did before transmitting
      return (((x & 0xffff) << 16) | ((x >>> 16) & 0xffff)) >>> 0;
    };

    const parseCmd = (word: number) => {
      // Basic Cyw43Cmd parse
      return {
        isWrite: (word & (1 << 31)) !== 0,
        function: (word >>> 28) & 0x03,
        address: (word >>> 11) & 0x1ffff,
        length: word & 0x7ff
      };
    };

    const csListener = (state: boolean) => {
      isSelected = !state;
      console.log(`[PicoW GPIO] CS = ${state ? 'HIGH' : 'LOW'}`);
      if (!isSelected) {
        // CS HIGH (idle) -> drive IRQ
        rp2040.gpio[WL_D].setInputValue(this.cyw43!.irq);
      } else {
        // CS LOW (active) -> start transaction
        rp2040.gpio[WL_D].setInputValue(false);
        bitCount = 0;
        shiftIn = 0;
        replyData = new Uint32Array(0);
        replyIdx = 0;
        shiftOut = 0;
        currentCmd = null;
      }
    };
    rp2040.gpio[WL_CS].addListener(csListener);
    this.cyw43GpioHooks.push({ restore: () => rp2040.gpio[WL_CS].removeListener?.(csListener) });

    const clkListener = (state: boolean) => {
      if (!isSelected) return;

      if (state) {
        // RISING EDGE: Sample MOSI
        const mosi = rp2040.gpio[WL_D].value ? 1 : 0;
        shiftIn = ((shiftIn << 1) | mosi) >>> 0;
        bitCount++;
        
        if (bitCount % 8 === 0) {
            console.log(`[PicoW GPIO] CLK RISING, bitCount=${bitCount}, shiftIn=0x${shiftIn.toString(16)}`);
        }

        if (bitCount === 32) {
          const word = transformValue(shiftIn);
          console.log(`[PicoW SPI] Received word: 0x${word.toString(16).padStart(8, '0')} (raw shiftIn: 0x${shiftIn.toString(16).padStart(8, '0')})`);
          
          if (!currentCmd) {
            currentCmd = parseCmd(word);
            if (currentCmd.isWrite) {
              writePayload = new Uint8Array(currentCmd.length || 4); // handles len=0 => 4 bytes
              writeIdx = 0;
            } else {
              const rawReply = this.cyw43!.onCommand(currentCmd, new Uint8Array(0));
              const wordCount = Math.ceil(rawReply.length / 4);
              replyData = new Uint32Array(wordCount);
              for (let i = 0; i < wordCount; i++) {
                const b0 = rawReply[i*4] || 0;
                const b1 = rawReply[i*4+1] || 0;
                const b2 = rawReply[i*4+2] || 0;
                const b3 = rawReply[i*4+3] || 0;
                let w = ((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0;
                replyData[i] = w;
              }
              replyIdx = 0;
              if (replyIdx < replyData.length) {
                shiftOut = replyData[replyIdx++];
              }
            }
          } else {
            if (currentCmd.isWrite) {
              if (writeIdx < writePayload.length) writePayload[writeIdx++] = (word >>> 24) & 0xff;
              if (writeIdx < writePayload.length) writePayload[writeIdx++] = (word >>> 16) & 0xff;
              if (writeIdx < writePayload.length) writePayload[writeIdx++] = (word >>> 8) & 0xff;
              if (writeIdx < writePayload.length) writePayload[writeIdx++] = word & 0xff;

              if (writeIdx >= writePayload.length) {
                this.cyw43!.onCommand(currentCmd, writePayload);
                // Can accept more if padded
              }
            } else {
              if (replyIdx < replyData.length) {
                shiftOut = replyData[replyIdx++];
              } else {
                shiftOut = 0;
              }
            }
          }
          shiftIn = 0;
          bitCount = 0;
        }
      } else {
        // FALLING EDGE: Drive MISO
        if (currentCmd && !currentCmd.isWrite) {
          const bit = (shiftOut & 0x80000000) !== 0;
          // Set rawInputValue directly to avoid triggering rp2040js IRQ listeners during SPI
          (rp2040.gpio[WL_D] as any).rawInputValue = bit;
          shiftOut = (shiftOut << 1) >>> 0;
        }
      }
    };
    rp2040.gpio[WL_CLK].addListener(clkListener);
    this.cyw43GpioHooks.push({ restore: () => rp2040.gpio[WL_CLK].removeListener?.(clkListener) });

    console.log(`[PicoW] CYW43 Emulator attached via GPIO pins (Wokwi-style).`);
  }

  private _queueCyw43Reply(smLabel: string, reply: Uint8Array, leadDummyWords = 0): void {
    const queue = this._getCyw43Queue(smLabel);
    for (let i = 0; i < leadDummyWords; i++) {
      queue.push(0);
    }
    for (let i = 0; i + 4 <= reply.length; i += 4) {
      // The PIO shifts data in from the SPI wire with shift_right=false (MSB first).
      // So the first byte received (reply[i]) becomes the most-significant byte in the ISR.
      const w = ((reply[i] << 24) | (reply[i + 1] << 16) | (reply[i + 2] << 8) | reply[i + 3]) >>> 0;
      queue.push(w);
    }
    if (reply.length % 4 !== 0) {
      const tail = reply.subarray(reply.length - (reply.length % 4));
      const pad = [0, 0, 0, 0];
      for (let i = 0; i < tail.length; i++) pad[i] = tail[i];
      const w = ((pad[0] << 24) | (pad[1] << 16) | (pad[2] << 8) | pad[3]) >>> 0;
      queue.push(w);
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
        this._resetCyw43BusState();
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
