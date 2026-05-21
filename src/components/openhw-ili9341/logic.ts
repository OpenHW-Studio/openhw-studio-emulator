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

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { buffer: this.vram, powerOn: true, t: Date.now() };
    }

    private get dcHigh(): boolean {
        return this.getPinVoltage('DC') > 2.5;
    }

    update(cpuCycles: number, currentWires: any[], instances: BaseComponent[]) {
        super.update(cpuCycles, currentWires, instances);
        const now = Date.now();

        // Power Sensing: If VCC pin is low, we are powered off
        const vcc = this.getPinVoltage('VCC');
        const newPower = vcc > 2.0;

        if (newPower !== this.powerOn) {
            this.powerOn = newPower;
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
        const dmaAddress = parseInt(this.attrs?.dmaAddress || this.state?.dmaAddress || '0', 16);
        
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

    onSPIByteReceived(byte: number, byteIndex: number): void {
        const dmaAddress = parseInt(this.attrs?.dmaAddress || this.state?.dmaAddress || '0', 16);
        if (dmaAddress > 0 && !this.state.dmaBypassDisabled) return; // Bypass normal SPI processing if DMA active
        
        if (!this.powerOn) return;

        if (!this.dcHigh) {
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

                    if (this.currentX >= 0 && this.currentX < 240 && this.currentY >= 0 && this.currentY < 320) {
                        const idx = (this.currentY * 240 + this.currentX) * 3;
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
    }
}
