import { BaseComponent } from '../BaseComponent';
import { SPIProtocol } from '../../protocol-handlers/index';

export class ILI9341Logic extends SPIProtocol {
    private currentCommand = 0;

    // Windowing 
    private colStart = 0;
    private colEnd = 239;
    private rowStart = 0;
    private rowEnd = 319;
    private currentX = 0;
    private currentY = 0;

    // Private parameter buffering
    private params: number[] = [];

    // 16-bit color buffering
    private secondByte = false;
    private firstByteValue = 0;

    // FULL VRAM BUFFER (240 * 320 * 3 bytes for RGB)
    private vram = new Uint8Array(240 * 320 * 3);
    private vramDirty = false;
    private lastSync = 0;
    private powerOn = true;
    private writeCount = 0;
    private madctl = 0x48;
    private vccDetected = true;
    private powerOffCountdown = 0;

    // Compact snapshot settings
    private compactPrefixBytes = 64;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.powerOn = true;
        this.vccDetected = true;
        this.state = { buffer: this.vram, powerOn: true, t: Date.now(), spiFrames: [], compactSnapshot: null };
    }

    // CRC32 helper for compact snapshot
    private static crcTable: number[] | null = null;
    private static makeCRCTable(): number[] {
        const table: number[] = [];
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) {
                c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
            }
            table[n] = c >>> 0;
        }
        return table;
    }
    private static crc32(buf: Uint8Array): number {
        if (!ILI9341Logic.crcTable) ILI9341Logic.crcTable = ILI9341Logic.makeCRCTable();
        let crc = 0xFFFFFFFF;
        const table = ILI9341Logic.crcTable;
        for (let i = 0; i < buf.length; i++) {
            crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    private get dcHigh(): boolean {
        return this.getPinVoltage('DC') > 2.5;
    }

    update(cpuCycles: number, currentWires: any[], instances: BaseComponent[]) {
        super.update(cpuCycles, currentWires, instances);
        const now = Date.now();

        // Power Sensing: Check if VCC pin is wired to a power source or explicitly powered
        const vcc = this.getPinVoltage('VCC');
        const vccIsHigh = vcc > 2.0;
        
        // Check if VCC is connected to a power rail via wiring
        const hasWires = currentWires.length > 0;
        const vccConnected = currentWires.some(w => 
            (w.from === `${this.id}:VCC` || w.to === `${this.id}:VCC`) &&
            (w.from?.includes('5V') || w.from?.includes('3V3') || w.from?.includes('VIN') || w.from?.includes('VBUS') ||
             w.to?.includes('5V') || w.to?.includes('3V3') || w.to?.includes('VIN') || w.to?.includes('VBUS'))
        );

        // Power state machine: 
        // - If VCC is high or connected to power rail, stay powered
        // - Only power off if we see explicit low voltage AND stay low for multiple frames
        if (vccIsHigh || vccConnected || !hasWires) {
            this.vccDetected = true;
            this.powerOffCountdown = 0;
        } else {
            this.powerOffCountdown++;
        }

        // Require 10 consecutive frames of low/no VCC before powering off (debounce)
        const newPower = this.vccDetected && (this.powerOffCountdown < 10);

        if (newPower !== this.powerOn) {
            this.powerOn = newPower;
            this.state.powerOn = newPower;
            this.stateChanged = true;
            if (!this.powerOn) {
                this.vram.fill(0);
                this.vramDirty = true;
            }
        }

        // Periodic Sync (10Hz heartbeat + dirty flag for immediate response)
        // We sync if dirty OR at least every 100ms to keep heartbeats alive
        if (this.vramDirty || (now - this.lastSync > 100)) {
            this.lastSync = now;
            this.vramDirty = false;
            this.stateChanged = true;
        }

        // DMA Bypass Optimization for Displays
        const dmaAddress = parseInt((this as any).attrs?.dmaAddress || this.state?.dmaAddress || '0', 16);
        
        const hasLogicAnalyzer = this.isLogicAnalyzerAttached(instances);
        if (hasLogicAnalyzer) {
            this.state.dmaBypassDisabled = true;
            return; // Skip DMA polling and fallback to bit-banging
        }
        
        if (dmaAddress > 0 && this.powerOn) {
            const runner = (this as any)._runner;
            if (runner && runner.readDirectMemory && runner.getSimulatedTimeMs) {
                const nowMs = runner.getSimulatedTimeMs();
                // Polling at 60Hz
                if (!this.lastSync || (nowMs - this.lastSync) > 16) {
                    this.lastSync = nowMs;
                    // VRAM is 240 * 320 * 2 = 153,600 bytes (RGB565).
                    // Wait, our internal vram is 240*320*3 (RGB888) = 230,400 bytes.
                    // The DMA buffer in RP2040 is RGB565.
                    const dmaData = runner.readDirectMemory(dmaAddress, 240 * 320 * 2);
                    if (dmaData) {
                        for (let i = 0; i < 240 * 320; i++) {
                            const dmaIdx = i * 2;
                            // MSB first usually for ILI9341 SPI
                            const high = dmaData[dmaIdx];
                            const low = dmaData[dmaIdx + 1];
                            const full = (high << 8) | low;

                            const r = ((full >> 11) & 0x1f) << 3;
                            const g = ((full >> 5) & 0x3f) << 2;
                            const b = (full & 0x1f) << 3;

                            const idx = i * 3;
                            this.vram[idx] = r;
                            this.vram[idx + 1] = g;
                            this.vram[idx + 2] = b;
                        }
                        this.vramDirty = false; // We already processed it
                        this.stateChanged = true;
                    }
                }
            }
        }
    }

    onPinStateChange(pinId: string, isHigh: boolean, cycles: number) {
        super.onPinStateChange(pinId, isHigh, cycles);
        if (pinId === 'RESET' && !isHigh) {
            this.vram.fill(0);
            this.vramDirty = true;
        }
    }
    
    onCSAssert(): void {
        this.params = [];
        this.secondByte = false;
    }

    onCSDeassert(meta: any): void {
        // Record recent SPI frames for telemetry/debugging (bounded)
        try {
            const frame = meta?.frame || [];
            if (frame && frame.length > 0) {
                const max = 8;
                const buf = (this.state.spiFrames as any[]) || [];
                buf.push({ t: Date.now(), frame });
                while (buf.length > max) buf.shift();
                this.state.spiFrames = buf;
                this.state.spiTrafficCount = (this.state.spiTrafficCount || 0) + 1;
                this.stateChanged = true;
            }
        } catch (e) {
            // swallow telemetry errors
        }
    }

    onSPIByteReceived(byte: number, byteIndex: number): void {
        const dmaAddress = parseInt((this as any).attrs?.dmaAddress || this.state?.dmaAddress || '0', 16);
        if (dmaAddress > 0 && !this.state.dmaBypassDisabled) return; // Bypass normal SPI processing if DMA active
        
        if (!this.powerOn) {
            console.warn(`[ILI9341Logic] onSPIByteReceived ignored because powerOn is false! VCC voltage=${this.getPinVoltage('VCC')}`);
            return;
        }

        const isDC = this.dcHigh;


        if (!isDC) {
            this.currentCommand = byte;
            this.params = [];
            this.secondByte = false;
            if (byte === 0x2C) { // RAMWR
                this.currentX = this.colStart;
                this.currentY = this.rowStart;
            }
        } else {
            this.handleDataByte(byte);
        }
    }

    private handleDataByte(data: number) {
        switch (this.currentCommand) {
            case 0x2A: // CASET
                this.params.push(data);
                if (this.params.length === 4) {
                    this.colStart = (this.params[0] << 8) | this.params[1];
                    this.colEnd = (this.params[2] << 8) | this.params[3];
                    this.currentX = this.colStart;
                }
                break;

            case 0x2B: // PASET
                this.params.push(data);
                if (this.params.length === 4) {
                    this.rowStart = (this.params[0] << 8) | this.params[1];
                    this.rowEnd = (this.params[2] << 8) | this.params[3];
                    this.currentY = this.rowStart;
                }
                break;

            case 0x36: // MADCTL
                this.params.push(data);
                if (this.params.length === 1) {
                    this.madctl = this.params[0] & 0xff;
                }
                break;

            case 0x2C: // RAMWR - RGB565
                if (!this.secondByte) {
                    this.firstByteValue = data;
                    this.secondByte = true;
                } else {
                    const full = (this.firstByteValue << 8) | data;
                    this.secondByte = false;

                    const r = ((full >> 11) & 0x1f) << 3;
                    const g = ((full >> 5) & 0x3f) << 2;
                    const b = (full & 0x1f) << 3;

                    const mv = (this.madctl >> 5) & 1;
                    const mx = (this.madctl >> 6) & 1;
                    const my = (this.madctl >> 7) & 1;

                    let physX = 0;
                    let physY = 0;

                    if (mv === 0) {
                        // Portrait
                        physX = mx ? this.currentX : (239 - this.currentX);
                        physY = my ? (319 - this.currentY) : this.currentY;
                    } else {
                        // Landscape
                        physX = mx ? (239 - this.currentY) : this.currentY;
                        physY = my ? this.currentX : (319 - this.currentX);
                    }

                    if (physX >= 0 && physX < 240 && physY >= 0 && physY < 320) {
                        const idx = (physY * 240 + physX) * 3;
                        this.vram[idx] = r;
                        this.vram[idx + 1] = g;
                        this.vram[idx + 2] = b;
                        this.vramDirty = true;
                        this.writeCount += 1;
                    }

                    this.currentX++;
                    if (this.currentX > this.colEnd) {
                        this.currentX = this.colStart;
                        this.currentY++;
                        if (this.currentY > this.rowEnd) {
                            this.currentY = this.rowStart;
                        }
                    }
                }
                break;
        }
    }

    getSyncState() {
        return {
            buffer: this.vram,
            powerOn: this.powerOn,
            t: Date.now()
        };
    }

    onCustomTelemetry() {
        let activeCount = 0;
        // sampling every 3 bytes (RGB)
        for (let i = 0; i < this.vram.length; i += 3) {
            if (this.vram[i] > 0 || this.vram[i + 1] > 0 || this.vram[i + 2] > 0) activeCount++;
        }
        const total = 240 * 320;
        const fillPercent = (activeCount / total) * 100;
        const orientation = (this.madctl & 0x20) !== 0 ? 'landscape' : 'portrait';
        this.setCustomTelemetry({
            powerStatus: this.powerOn ? "On" : "Off",
            resolution: "240x320",
            orientation,
            writeCount: this.writeCount,
            vramFillPercentage: Number(fillPercent.toFixed(1)),
        });

        // Also publish a compact snapshot to state for lightweight telemetry
        try {
            const prefix = Math.min(this.compactPrefixBytes, this.vram.length);
            const firstBytes = new Uint8Array(prefix);
            for (let i = 0; i < prefix; i++) firstBytes[i] = this.vram[i];
            const checksum = ILI9341Logic.crc32(firstBytes);
            this.state.compactSnapshot = {
                firstBytes: Array.from(firstBytes),
                checksum,
                vramFillPercentage: Number(fillPercent.toFixed(1)),
                writeCount: this.writeCount,
                width: 240,
                height: 320
            };
            this.stateChanged = true;
        } catch (e) {
            // ignore telemetry failures
        }
    }
}
