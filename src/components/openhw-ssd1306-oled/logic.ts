import { createValidationIssue } from '../component-schema.js';
import { WasmComponent } from '../WasmComponent';
import { I2cBusFramer } from '../../protocol-handlers/index';
import { ssd1306GlueLoader } from './glue';

// §12.4 WASM-heavy layout (same as ILI9341): `extends WasmComponent`
// DIRECTLY + an owned I2cBusFramer for pure address/buffer bookkeeping.
// WASM owns COMPUTE (frame pacing + descriptor numerics); TS owns bus
// event decode (register shadow + 1K VRAM), state, validate, uiState.
// fallbackUpdate() = REQUIRED JS reference.
//
// Why not `extends I2CProtocol`: same double-dispatch problem as the TFT
// (protocol base + WASM adapter owning the same onI2CByte). Composition
// gives exactly ONE owner per bus event. See I2cBusFramer docs.
export class SSD1306Logic extends WasmComponent {
  private vram: Uint8Array;

  private awaitingControlByte = true;
  private isDataMode = false;
  private burstMode = false;

  // Display configuration
  private addressingMode = 2; // Default to Page Addressing Mode
  private pageStart = 0;
  private pageEnd = 7;
  private colStart = 0;
  private colEnd = 127;
  private page = 0;
  private column = 0;

  // Hardware configuration
  private displayOn = true;
  private invert = false;
  private allOn = false;
  private contrast = 0x7F;
  private displayStartLine = 0;
  private segmentRemap = false;
  private multiplexRatio = 63;
  private comScanDir = false; // false = normal, true = remap
  private displayOffset = 0;
  private comConfig = 0x12;

  private pendingCommand = 0;
  private pendingArgs = 0;
  private args: number[] = [];

  private vramDirty = false;
  private stateUpdateCount = 0;
  private lastUpdateCycle = 0;
  private cycleCount = 0;

  // Owned I2C framer (composition, NOT inheritance): pure address match
  // + write-buffer assembly. Runner bytes enter via onI2CStart/onI2CByte/
  // onI2CStop/onI2CReadByte below — exactly once.
  private i2cAddr = 0x3c;
  private i2c = new I2cBusFramer(0x3c, {
    onWriteRegister: (reg, data) => this.i2cWriteRegister(reg, data),
    onReadRequest: (reg, count) => this.i2cReadRequest(reg, count),
    onStop: () => { this.awaitingControlByte = true; },
  });

  constructor(id: string, manifest: any) {
    super(id, manifest);
    // §12.4: attach the WASM loader; WasmComponent owns core/ready/load.
    this.setGlueLoader(ssd1306GlueLoader as any);
    const rawAddr = Number(manifest?.attrs?.address ?? manifest?.attrs?.i2cAddress ?? manifest?.attrs?.addr ?? 0x3c);
    this.i2cAddr = Number.isFinite(rawAddr) ? (rawAddr & 0x7f) : 0x3c;
    // Rebuild the framer with the resolved address (field initializers run
    // before the constructor body, so the default 0x3c above is replaced).
    this.i2c = new I2cBusFramer(this.i2cAddr, {
      onWriteRegister: (reg, data) => this.i2cWriteRegister(reg, data),
      onReadRequest: (reg, count) => this.i2cReadRequest(reg, count),
      onStop: () => { this.awaitingControlByte = true; },
    });
    this.vram = new Uint8Array(typeof SharedArrayBuffer !== 'undefined' ? new SharedArrayBuffer(1024) : 1024);



    this.state = {
      ...this.state,
      i2cAddress: this.i2cAddr,
      i2cRxBytes: 0,
      i2cTxBytes: 0,
      lastRegister: null,
      lastWriteData: [],
      lastReadData: [],
      vram: this.vram,
      invert: false,
      allOn: false,
      displayOn: true,
      displayStartLine: 0,
      segmentRemap: false,
      comScanDir: false,
      displayOffset: 0,
      vramDirty: false,
      updateCount: 0,
    };
  }

  // ── Runner entry points (SINGLE dispatch owner) ────────────────

  getI2CAddress(): number { return this.i2cAddr; }

  onI2CStart(address: number, read: boolean): boolean {
    const ack = this.i2c.start(address, read);
    if (ack && read) {
      // Mirror the protocol-base read-queue snapshot into state.
      this.state.lastReadMode = true;
      this.stateChanged = true;
    } else if (ack) {
      this.state.lastReadMode = false;
      this.stateChanged = true;
    }
    return ack;
  }

  onI2CByte(addr: number, data: number) {
    const byte = data & 0xff;
    this.state.i2cRxBytes = Number(this.state.i2cRxBytes || 0) + 1;
    this.stateChanged = true;
    // Framer assembles the write buffer; control/data decode below.
    this.i2c.pushByte(byte);
    this.ssdByteIn(byte);
    return true;
  }

  onI2CReadByte(): number {
    const b = this.i2c.readByte(0xff);
    this.state.i2cTxBytes = Number(this.state.i2cTxBytes || 0) + 1;
    this.stateChanged = true;
    return b;
  }

  onI2CStop(): void {
    this.i2c.stop();
  }

  // ── Framer event handlers (private decode; the ONLY I2C consumers) ──

  /** Register-write decode: SSD1306 has no register map — every payload
   * byte is a control/data stream byte. */
  private i2cWriteRegister(_reg: number, _data: number[]): void {}

  private i2cReadRequest(_reg: number, _count: number): number[] {
    return [];
  }

  /**
   * REQUIRED JS reference (§12.4): 60 FPS frame gate emitting state when
   * VRAM changed. Runs when no WASM core is loaded (WasmComponent
   * fallbackUpdate dispatch).
   */
  protected fallbackUpdate(cpuCycles: number): void {
    this.jsFrameGate(cpuCycles);
  }

  /**
   * Post-core housekeeping on the WASM path: pull descriptor views, then
   * run the SAME frame gate as the JS reference (shared helper — no drift).
   */
  protected afterWasmUpdate(cpuCycles: number): void {
    this.pullWasmDescriptorState();
    this.jsFrameGate(cpuCycles);
  }

  /** JS reference frame gate (60 FPS): emits state when VRAM changed. */
  private jsFrameGate(cpuCycles: number): void {
    if (this.lastUpdateCycle === 0) {
      this.lastUpdateCycle = cpuCycles;
      return;
    }
    const delta = cpuCycles - this.lastUpdateCycle;
    this.lastUpdateCycle = cpuCycles;

    this.cycleCount += delta;
    // 60FPS update (16ms @ 16MHz ~= 266666 cycles)
    if (this.cycleCount >= 266666) {
      this.cycleCount %= 266666;
      if (this.vramDirty) {
        this.vramDirty = false;
        this.stateUpdateCount += 1;
        this.setState({
          vram: this.vram,
          invert: this.invert,
          allOn: this.allOn,
          displayOn: this.displayOn,
          displayStartLine: this.displayStartLine,
          displayOffset: this.displayOffset,
          segmentRemap: this.segmentRemap,
          comScanDir: this.comScanDir,
          vramDirty: false,
          updateCount: this.stateUpdateCount,
        });
      }
    }
  }

  /** Notify the WASM descriptor core of a VRAM/displayOn change (event path). */
  private markCoreDirty(): void {
    if (!this.core) return;
    try {
      this.core.markDirty?.(this.displayOn ? 1 : 0);
    } catch { /* core stays stale; JS reference wins */ }
  }

  /**
   * Mirror WASM descriptor views into JS state (dirty-gated).
   * View layout (see glue.ts readStateViews): f[0]=updateCount,
   * i[0]=displayOn, i[1]=dirty.
   */
  protected pullWasmDescriptorState(): void {
    const core = this.core;
    if (!core) return;
    let views: { f: Float32Array; i: Int32Array } | null = null;
    try {
      views = core.readStateViews();
    } catch {
      return;
    }
    if (!views) return;
    const updateCount = views.f.length > 0 ? Math.round(views.f[0]) : this.stateUpdateCount;
    const displayOn = views.i.length > 0 ? views.i[0] !== 0 : this.displayOn;
    if (updateCount !== this.stateUpdateCount || displayOn !== this.displayOn) {
      this.stateUpdateCount = updateCount;
      this.displayOn = displayOn;
      this.setState({
        vram: this.vram,
        invert: this.invert,
        allOn: this.allOn,
        displayOn: this.displayOn,
        displayStartLine: this.displayStartLine,
        segmentRemap: this.segmentRemap,
        comScanDir: this.comScanDir,
        displayOffset: this.displayOffset,
        vramDirty: false,
        updateCount: this.stateUpdateCount,
      });
    }
  }

  /**
   * Control/data stream decode (was onI2CByte body under I2CProtocol).
   * Called exactly once per byte from the onI2CByte() entry above.
   */
  private ssdByteIn(data: number) {
    // console.log(`[SSD1306 OLED] Received I2C byte: 0x${data.toString(16)}`);


    if (this.awaitingControlByte) {
      this.isDataMode = (data & 0x40) !== 0;
      this.burstMode = (data & 0x80) === 0;
      this.awaitingControlByte = false;
      return true;
    }

    if (this.isDataMode) {
      this.writeVram(data);
    } else {
      this.processCommand(data);
    }

    if (!this.burstMode) {
      this.awaitingControlByte = true;
    }
    return true;
  }

  private writeVram(data: number) {
    const index = (this.page * 128) + this.column;
    if (index >= 0 && index < 1024) {
      this.vram[index] = data;
      this.vramDirty = true;
      this.markCoreDirty();
    }

    if (this.addressingMode === 0) { // Horizontal
      this.column++;
      if (this.column > this.colEnd) {
        this.column = this.colStart;
        this.page++;
        if (this.page > this.pageEnd) this.page = this.pageStart;
      }
    } else if (this.addressingMode === 1) { // Vertical
      this.page++;
      if (this.page > this.pageEnd) {
        this.page = this.pageStart;
        this.column++;
        if (this.column > this.colEnd) this.column = this.colStart;
      }
    } else { // Page
      this.column++;
      if (this.column > 127) this.column = 0;
    }
  }

  private getExpectedArgs(cmd: number): number {
    if (this.pendingArgs > 0) return this.pendingArgs;

    switch (cmd) {
      case 0x81: return 1; // Contrast
      case 0x20: return 1; // Addressing Mode
      case 0x21: return 2; // Column Range
      case 0x22: return 2; // Page Range
      case 0xA8: return 1; // Multiplex Ratio
      case 0xD3: return 1; // Display Offset
      case 0xD5: return 1; // Display Clock Divide Ratio
      case 0xD9: return 1; // Pre-charge Period
      case 0xDA: return 1; // COM Pins Config
      case 0xDB: return 1; // VCOMH Deselect Level
      case 0x8D: return 1; // Charge Pump
      default: return 0;
    }
  }

  private processCommand(cmd: number) {
    if (this.pendingArgs > 0) {
      this.args.push(cmd);
      this.pendingArgs--;
      if (this.pendingArgs === 0) this.executeCommand();
      return;
    }

    const expected = this.getExpectedArgs(cmd);
    if (expected > 0) {
      this.pendingCommand = cmd;
      this.pendingArgs = expected;
      this.args = [];
      return;
    }

    // Single byte commands
    if (cmd >= 0xB0 && cmd <= 0xB7) { // Set Page Start for Page Mode
      this.page = cmd & 0x07;
    } else if ((cmd & 0xF0) === 0x00) { // Set Lower Column Address
      this.column = (this.column & 0xF0) | (cmd & 0x0F);
    } else if ((cmd & 0xF0) === 0x10) { // Set Higher Column Address
      this.column = (this.column & 0x0F) | ((cmd & 0x0F) << 4);
    } else if (cmd >= 0x40 && cmd <= 0x7F) { // Set Display Start Line
      this.displayStartLine = cmd & 0x3F;
      this.vramDirty = true;
      this.markCoreDirty();
    } else {
      switch (cmd) {
        case 0xA0: case 0xA1: // Segment Remap
          this.segmentRemap = (cmd === 0xA1);
          this.vramDirty = true;
          this.markCoreDirty();
          break;
        case 0xC0: case 0xC8: // COM Output Scan Direction
          this.comScanDir = (cmd === 0xC8);
          this.vramDirty = true;
          this.markCoreDirty();
          break;
        case 0xA4: this.allOn = false; this.vramDirty = true; this.markCoreDirty(); break;
        case 0xA5: this.allOn = true; this.vramDirty = true; this.markCoreDirty(); break;
        case 0xA6: this.invert = false; this.vramDirty = true; this.markCoreDirty(); break;
        case 0xA7: this.invert = true; this.vramDirty = true; this.markCoreDirty(); break;
        case 0xAE: this.displayOn = false; this.vramDirty = true; this.markCoreDirty(); break;
        case 0xAF: this.displayOn = true; this.vramDirty = true; this.markCoreDirty(); break;
      }
    }
  }

  private executeCommand() {
    switch (this.pendingCommand) {
      case 0x20: this.addressingMode = this.args[0] & 0x03; break;
      case 0x21:
        this.colStart = this.args[0] & 0x7F;
        this.colEnd = this.args[1] & 0x7F;
        this.column = this.colStart;
        break;
      case 0x22:
        this.pageStart = this.args[0] & 0x07;
        this.pageEnd = this.args[1] & 0x07;
        this.page = this.pageStart;
        break;
      case 0x81: this.contrast = this.args[0]; break;
      case 0xA8: this.multiplexRatio = this.args[0] & 0x3F; break;
      case 0xD3: this.displayOffset = this.args[0] & 0x3F; this.vramDirty = true; this.markCoreDirty(); break;
      case 0xDA: this.comConfig = this.args[0]; this.vramDirty = true; this.markCoreDirty(); break;
    }
    this.pendingCommand = 0;
  }

  getSyncState() { return { ...this.state }; }

  onCustomTelemetry() {
    let activePixels = 0;
    const totalPixels = 128 * 64;
    // vram usually 1 byte per 8 pixels
    for (let i = 0; i < this.vram.length; i++) {
        let b = this.vram[i];
        while (b > 0) {
            if (b & 1) activePixels++;
            b >>= 1;
        }
    }

    const fillPercent = (activePixels / totalPixels) * 100;
    this.setCustomTelemetry({
        powerStatus: this.displayOn ? "On" : "Off",
        displayMode: this.invert ? "Inverted" : "Normal",
        contrast: this.contrast,
        vramFillPercentage: Number(fillPercent.toFixed(1)),
        addressingMode: this.addressingMode
    });
  }

    // 12.4 v2: numeric UI state for SAB slot {i0: displayOn} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {},
            i: {displayOn: (s.displayOn ? 1 : 0)},
        };
    }
    validate(component: any, graph: Map<string, string[]>, validator?: any) {
        const pins = validator.getComponentPins(component);
        const sda = pins.find((p: string) => p.includes('SDA'));
        const scl = pins.find((p: string) => p.includes('SCL'));
        const vcc = pins.find((p: string) => p.includes('VCC') || p.includes('V+'));
        const gnd = pins.find((p: string) => p.includes('GND'));
        const issues = [];

        if (vcc) {
            const node = `${component.id}.${vcc}`;
            if (((validator ? validator.getNeighbors(node) : (graph.get(node) || []))).length === 0) {
                issues.push(createValidationIssue({
                    ruleId: 'ssd1306-i2c-interface-check',
                    severity: 'warn',
                    message: `⚠️ [${component.type} ${component.id}] Power (VCC) is not connected.`,
                    compIds: [component.id],
                    remediation: 'Connect VCC to the correct supply rail.',
                    autoFix: true,
                }));
            } else if (!validator.hasResistivePathToSupply(node)) {
                issues.push(createValidationIssue({
                    ruleId: 'ssd1306-i2c-interface-check',
                    severity: 'warn',
                    message: `⚠️ [${component.type} ${component.id}] Power (VCC) is connected but does not reach a valid power supply rail.`,
                    compIds: [component.id],
                    remediation: 'Ensure VCC path connects to a 3.3V/5V power source.',
                }));
            }
        }

        if (gnd) {
            const node = `${component.id}.${gnd}`;
            if (((validator ? validator.getNeighbors(node) : (graph.get(node) || []))).length === 0) {
                issues.push(createValidationIssue({
                    ruleId: 'ssd1306-i2c-interface-check',
                    severity: 'warn',
                    message: `⚠️ [${component.type} ${component.id}] Ground (GND) is not connected.`,
                    compIds: [component.id],
                    remediation: 'Connect GND to the common ground rail.',
                    autoFix: true,
                }));
            } else {
                const gndSources = validator.collectVoltageSources(node);
                if (!gndSources.some((s: any) => s.voltage === 0)) {
                    issues.push(createValidationIssue({
                        ruleId: 'ssd1306-i2c-interface-check',
                        severity: 'warn',
                        message: `⚠️ [${component.type} ${component.id}] Ground (GND) is connected but does not reach a valid ground rail (GND).`,
                        compIds: [component.id],
                        remediation: 'Ensure GND path connects to a valid ground rail.',
                    }));
                }
            }
        }
        if (sda && ((validator ? validator.getNeighbors(`${component.id}.${sda}`) : (graph.get(`${component.id}.${sda}`) || []))).length === 0) {
            issues.push(createValidationIssue({
                ruleId: 'ssd1306-i2c-interface-check',
                severity: 'warn',
                message: `⚠️ [${component.type} ${component.id}] I2C SDA pin is floating.`,
                compIds: [component.id],
                remediation: 'Connect SDA to the MCU I2C data pin.',
                autoFix: true,
            }));
        }
        if (scl && ((validator ? validator.getNeighbors(`${component.id}.${scl}`) : (graph.get(`${component.id}.${scl}`) || []))).length === 0) {
            issues.push(createValidationIssue({
                ruleId: 'ssd1306-i2c-interface-check',
                severity: 'warn',
                message: `⚠️ [${component.type} ${component.id}] I2C SCL pin is floating.`,
                compIds: [component.id],
                remediation: 'Connect SCL to the MCU I2C clock pin.',
                autoFix: true,
            }));
        }

        return issues.length > 0 ? issues : null;
    }
}
