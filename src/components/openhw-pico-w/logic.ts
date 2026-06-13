import { BaseComponent } from '../BaseComponent';

import { Cyw43Emulator } from './cyw43-emulator';
import { SPIPeripheral } from './spi-peripheral';

function normalizePicoPin(pinId: string): string {
  const s = String(pinId || '').toUpperCase();
  if (/^GPIO\d+$/.test(s)) return `GP${s.slice(4)}`;
  if (/^D\d+$/.test(s)) return `GP${s.slice(1)}`;
  if (/^\d+$/.test(s)) return `GP${s}`;
  return s;
}

export class PicoWLogic extends BaseComponent {
  private ws: WebSocket | null = null;
  private isWsOpen: boolean = false;
  private reconnectInterval: any = null;
  private cyw43Emulator: Cyw43Emulator | null = null;
  private cyw43DrainTimer: any = null;
  private rp2040Ref: any = null;
  private cyw43GpioHooks: Array<{ restore: () => void }> = [];
  private pcapBuffer: { timeUs: number; data: Uint8Array }[] = [];

  constructor(id: string, manifest: any) {
    super(id, manifest);
    this.state = {
      txActive:       false,
      rxActive:       false,
      builtInLed:     false,
      wirelessStatus: 'idle',
      wifiConnected:  false,
      wifiSsid:       '',
      wifiIp:         '',
      wifiPacketCount: 0,
      ...this.state,
    };
  }

  override onSimulationStart(): void {
    console.log('[PicoW] Initializing network gateway connection...');
    this.pcapBuffer = [];
    this.connectToGateway();

    // Drain timer to process any pending packets in the CYW43 emulator
    this.cyw43DrainTimer = setInterval(() => {
        if (this.cyw43Emulator) {
            let buf = new Uint32Array(1);
            this.cyw43Emulator.busRead(8, buf);
        }
    }, 10);
  }

  private connectToGateway() {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    try {
      const isPrivate = this.attrs?.privateGateway === 'true' || this.attrs?.privateGateway === true;
      const sessionId = this.attrs?.sessionId || '';

      let wsUrl = '';
      if (isPrivate) {
        wsUrl = 'ws://127.0.0.1:5099/api/network-gateway';
      } else {
        // Resolve public URL dynamically
        const locationObj = typeof window !== 'undefined' ? window.location : (typeof self !== 'undefined' ? self.location : null);
        const isLocalhost = locationObj ? (locationObj.hostname === 'localhost' || locationObj.hostname === '127.0.0.1') : true;

        let publicUrl = '';
        if (isLocalhost) {
          const defaultServer = 'wss://openhw-studio.fossee.in';
          const viteUrl = (globalThis as any).import?.meta?.env?.VITE_PUBLIC_GATEWAY_URL || (globalThis as any).VITE_PUBLIC_GATEWAY_URL || defaultServer;
          publicUrl = viteUrl + '/api/network-gateway';
        } else if (locationObj) {
          const protocol = locationObj.protocol === 'https:' ? 'wss:' : 'ws:';
          publicUrl = `${protocol}//${locationObj.host}/api/network-gateway`;
        } else {
          publicUrl = 'wss://api.openhw-studio.com:5099/api/network-gateway';
        }
        wsUrl = publicUrl;
      }

      if (sessionId) {
        wsUrl += `?sessionId=${encodeURIComponent(sessionId)}`;
      }

      console.log(`[PicoW] Connecting to network gateway URL: ${wsUrl} (privateGateway=${isPrivate}, sessionId="${sessionId}")`);

      this.ws = new WebSocket(wsUrl);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        console.log('[PicoW] Connected to networking gateway');
        this.isWsOpen = true;
      };

      this.ws.onclose = (event) => {
        console.warn(`[PicoW] Gateway WebSocket closed (code=${event.code}, reason=${event.reason || 'none'}). Retrying in 5s...`);
        this.isWsOpen = false;
        this.ws = null;
        if (!this.reconnectInterval) {
          this.reconnectInterval = setTimeout(() => {
            this.reconnectInterval = null;
            this.connectToGateway();
          }, 5000);
        }
      };

      this.ws.onerror = (e) => {
        console.error('[PicoW] Gateway WebSocket error:', e);
      };

      this.ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          const frame = new Uint8Array(event.data);
          this.pcapBuffer.push({ timeUs: performance.now() * 1000, data: frame });
          // console.log(`[PicoW RX] Ethernet frame in (len=${frame.length}) <- Gateway`);
          if (this.cyw43Emulator) {
              this.cyw43Emulator.writeFrame(frame);
          }
          this._sniffDhcpAck(frame);
        }
      };
    } catch (e) {
      console.error(`[PicoW] Failed to connect to gateway:`, e);
    }
  }

  public sendPacketToGateway(packet: Uint8Array): void {
      this.pcapBuffer.push({ timeUs: performance.now() * 1000, data: packet });
      if (!this.isWsOpen || !this.ws) {
          console.warn(`[PicoW TX] Cannot send packet: WebSocket is not open (len=${packet.length})`);
          return;
      }
      // console.log(`[PicoW TX] Ethernet frame out (len=${packet.length}) -> Gateway`);
      this.setState({ wirelessPacketCount: (this.state.wirelessPacketCount || 0) + 1 });
      this.ws.send(packet.buffer.slice(packet.byteOffset, packet.byteOffset + packet.byteLength));
  }

  public getPcapBuffer(): ArrayBuffer | null {
      if (this.pcapBuffer.length === 0) return null;

      let totalLen = 24; // PCAP Global Header
      for (const pkt of this.pcapBuffer) {
          totalLen += 16 + pkt.data.length;
      }

      const buffer = new ArrayBuffer(totalLen);
      const view = new DataView(buffer);
      const u8 = new Uint8Array(buffer);
      
      // Global Header (Big-Endian format)
      view.setUint32(0, 0xa1b2c3d4, false); // Magic 
      view.setUint16(4, 2, false); // Major
      view.setUint16(6, 4, false); // Minor
      view.setInt32(8, 0, false); // Thiszone
      view.setUint32(12, 0, false); // Sigfigs
      view.setUint32(16, 65535, false); // Snaplen
      view.setUint32(20, 1, false); // Network (Ethernet)

      let offset = 24;
      for (const pkt of this.pcapBuffer) {
          const sec = Math.floor(pkt.timeUs / 1000000);
          const usec = Math.floor(pkt.timeUs % 1000000);
          view.setUint32(offset, sec, false);
          view.setUint32(offset + 4, usec, false);
          view.setUint32(offset + 8, pkt.data.length, false);
          view.setUint32(offset + 12, pkt.data.length, false);
          u8.set(pkt.data, offset + 16);
          offset += 16 + pkt.data.length;
      }

      return buffer;
  }

  override onSimulationStop(): void {
    if (this.cyw43DrainTimer) {
      clearInterval(this.cyw43DrainTimer);
      this.cyw43DrainTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    this.isWsOpen = false;
    
    for (const h of this.cyw43GpioHooks) h.restore();
    this.cyw43GpioHooks = [];
    this.cyw43Emulator = null;

    this.setState({
      wirelessStatus:  'idle',
      wifiConnected:   false,
      wifiSsid:        '',
      wifiIp:          '',
      wifiPacketCount: 0,
    });
  }

  // ── CYW43 GPIO Hooks (Exact Wokwi SPI Bit-Banging Match) ─────────────
  
  public attachGpioHooks(rp2040: any) {
      if (this.cyw43Emulator) return;
      this.rp2040Ref = rp2040;
      this.cyw43Emulator = new Cyw43Emulator();

      // Fix RP2040 PIO StateMachine simulation stepping when disabled.
      // In rp2040js, StateMachine.step() does not check if the machine is enabled,
      // which causes disabled state machines to execute instructions and leak clock cycles.
      // Because rp2040-runner.ts overrides machine.step on the instance level, we patch each instance directly.
      try {
          for (const pio of rp2040.pio) {
              for (const machine of pio.machines) {
                  if (!machine.__patchedForEnabled) {
                      machine.__patchedForEnabled = true;
                      const originalStep = machine.step;
                      machine.step = function() {
                          if (!this.enabled) return;
                          originalStep.apply(this, arguments);
                      };
                  }
              }
          }
          console.log('[PicoW] Patched all PIO StateMachine instances');
      } catch (e: any) {
          console.error('[PicoW] Failed to patch PIO StateMachine instances:', e.message, e.stack);
      }

      this.cyw43Emulator.onGPIOUpdated = (val: number) => {
          this.setState({ builtInLed: !!(val & 1) });
      };

      this.cyw43Emulator.onPacketTx = (packet: Uint8Array) => {
          this.sendPacketToGateway(packet);
      };

      const WL_D = 24;
      const WL_CS = 25;
      const WL_CLK = 29;

      let isSelected = false; // Maps to Wokwi's `d` variable

      const pulseIrq = () => {
          if (this.cyw43Emulator && this.cyw43Emulator.irq && !isSelected) {
              const pin = rp2040.gpio[WL_D];
              // Briefly drop and raise the pin to force an edge transition 
              // for rp2040js to re-evaluate the level interrupt if it was masked.
              pin.setInputValue(false);
              pin.setInputValue(true);
          }
          if (this.rp2040Ref && this.cyw43Emulator) {
              // Pulse every 10us of simulated time if IRQ is still pending
              this.rp2040Ref.clock.createTimer(10, pulseIrq);
          }
      };
      rp2040.clock.createTimer(10, pulseIrq);

      this.cyw43Emulator.onIrqChanged = (irq: boolean) => {
          if (!isSelected) {
              const pin = rp2040.gpio[WL_D];
              
              // 1. Force digital input buffer
              pin.padValue |= 0x40; // IE bit
              
              // 2. Force the raw IRQ hardware flags inside the IO BANK
              if (irq) {
                  pin.irqForceMask |= 0x0A; // Force IRQ_LEVEL_HIGH and IRQ_EDGE_HIGH
                  // Also pulse immediately
                  pin.setInputValue(false);
                  pin.setInputValue(true);
              } else {
                  pin.irqForceMask &= ~0x0A;
                  pin.setInputValue(false);
              }
          }
      };

      const spi = new SPIPeripheral(
          () => !!rp2040.gpio[WL_D].value, // get MOSI
          (bit) => { (rp2040.gpio[WL_D] as any).rawInputValue = bit; } // set MISO directly
      );

      let byteCount = 0; // r
      let wordAcc = 0;   // n
      let isReading = false; // h
      let replyWord = 0; // l

      spi.onTransmit = (x: number) => {
          wordAcc |= (x << (byteCount * 8));
          if (++byteCount === 4) {
              if (!isReading) {
                  this.cyw43Emulator!.writeUint32(wordAcc);
                  
                  if (!(this as any)._loggedPio) {
                      (this as any)._loggedPio = true;
                      try {
                          const insts = [];
                          for (let i = 0; i < 32; i++) {
                              insts.push(rp2040.pio[1].instructions[i].toString(16).padStart(4, '0'));
                          }
                          // console.log(`[PIO1] Instructions: ${insts.join(', ')}`);
                          
                          const insts0 = [];
                          for (let i = 0; i < 32; i++) {
                              insts0.push(rp2040.pio[0].instructions[i].toString(16).padStart(4, '0'));
                          }
                          // console.log(`[PIO0] Instructions: ${insts0.join(', ')}`);
                      } catch (e) { console.error('Failed to log PIO', e); }
                  }
                  
                  byteCount = 0;
                  wordAcc = 0;
                  if (!this.cyw43Emulator!.cmd || !this.cyw43Emulator!.cmd.write) {
                      isReading = true;
                  }
              }
              byteCount = 0;
              if (isReading) {
                  replyWord = this.cyw43Emulator!.readUint32();
                  // console.log(`[PicoW SPI] Fetching readUint32: 0x${replyWord.toString(16).padStart(8, '0')}`);
              }
          }
          // console.log(`[PicoW SPI] TX Byte: 0x${(replyWord & 255).toString(16)} | RX Byte: 0x${x.toString(16)}`);
          spi.sendByte(replyWord & 255);
          replyWord >>>= 8;
      };

      let transactionCount = 0;
      let clkEdgesInTransaction = 0;

      const clkListener = (val: number) => {
          if (isSelected) {
              clkEdgesInTransaction++;
          }
          spi.onClockEdge(val !== 0);
      };
      rp2040.gpio[WL_CLK].addListener(clkListener);
      this.cyw43GpioHooks.push({ restore: () => rp2040.gpio[WL_CLK].removeListener?.(clkListener) });

      const csListener = (val: number) => {
          isSelected = (val === 0);
          if (!isSelected) {
              transactionCount++;
              clkEdgesInTransaction = 0;
              
              // RESET SPI state completely!
              byteCount = 0;
              wordAcc = 0;
              isReading = false;
              spi.disable();

              // Propagate the interrupt state since CS went high (Wokwi-style)
              if (this.cyw43Emulator) {
                  const pin = rp2040.gpio[WL_D];
                  const irq = this.cyw43Emulator.irq;
                  
                  // 1. Force digital input buffer
                  pin.padValue |= 0x40; // IE bit
                  
                  // 2. Force the raw IRQ hardware flags inside the IO BANK
                  if (irq) {
                      pin.irqForceMask |= 0x0A; // Force IRQ_LEVEL_HIGH and IRQ_EDGE_HIGH
                  } else {
                      pin.irqForceMask &= ~0x0A;
                  }
                  
                  // 3. Set the simulated input value
                  pin.setInputValue(irq);
              }
          } else {
              clkEdgesInTransaction = 0;
              spi.enable();
          }

          this.cyw43Emulator!.setSelected(isSelected);
      };
      rp2040.gpio[WL_CS].addListener(csListener);
      this.cyw43GpioHooks.push({ restore: () => rp2040.gpio[WL_CS].removeListener?.(csListener) });

      console.log('[PicoW] Attached standalone Cyw43Emulator to GPIO24/25/29 (Wokwi-style)');
  }

  // ── Frame handling ────────────────────────────────────────────────────────────

  private _sniffDhcpAck(frame: Uint8Array): void {
    if (frame.length < 300) return;
    if (frame[12] !== 0x08 || frame[13] !== 0x00) return;
    const ipHeaderLen = (frame[14] & 0x0F) * 4;
    if (frame[23] !== 17) return;
    
    const udpOffset = 14 + ipHeaderLen;
    const srcPort = (frame[udpOffset] << 8) | frame[udpOffset + 1];
    const dstPort = (frame[udpOffset + 2] << 8) | frame[udpOffset + 3];
    
    if (srcPort === 67 && dstPort === 68) {
      const dhcpOffset = udpOffset + 8;
      if (frame[dhcpOffset] === 2) {
        const ipOffset = dhcpOffset + 16;
        const ipStr = `${frame[ipOffset]}.${frame[ipOffset + 1]}.${frame[ipOffset + 2]}.${frame[ipOffset + 3]}`;
        
        if (ipStr !== "0.0.0.0") {
           this.setState({
             wirelessStatus: 'connected',
             wifiConnected: true,
             wifiIp: ipStr
           });
           console.log(`[PicoW] Sniffed DHCP ACK! Assigned IP: ${ipStr}`);
        }
      }
    }
  }

  // ── GPIO / UART ───────────────────────────────────────────────────────────────

  onPinStateChange(pinId: string, isHigh: boolean, _cpuCycles: number) {
    const pin = normalizePicoPin(pinId);
    if (pin === 'GP23') {
      const wasHigh = (this as any)._lastGp23High !== false;
      (this as any)._lastGp23High = isHigh;
      if (!isHigh && wasHigh) {
        console.log('[PicoW] WL_REG_ON falling edge — resetting CYW43 emulator.');
        setTimeout(() => {
            try {
                const insts = [];
                for (let i = 0; i < 32; i++) {
                    insts.push(this.rp2040Ref.pio[1].instructions[i].toString(16).padStart(4, '0'));
                }
                // console.log(`[PIO1] Instructions: ${insts.join(', ')}`);
                
                const insts0 = [];
                for (let i = 0; i < 32; i++) {
                    insts0.push(this.rp2040Ref.pio[0].instructions[i].toString(16).padStart(4, '0'));
                }
                // console.log(`[PIO0] Instructions: ${insts0.join(', ')}`);
            } catch (e) { console.error('Failed to log PIO', e); }
        }, 100);
      }
    } else if (pin === 'GP25') {
      // Handled by attachPioHooks
    }
  }

  update(_cpuCycles: number, _currentWires: any[], _allComponentsInstances: BaseComponent[]) {
  }
}
