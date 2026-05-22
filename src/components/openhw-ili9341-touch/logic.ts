import { BaseComponent } from '../BaseComponent';

export class ILI9341TouchLogic extends BaseComponent {
    private dcHigh = false;
    private csHigh = true;
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

    // FT6206 Touch State (I2C Address 0x38)
    private isTouched = false;
    private touchX = 0;
    private touchY = 0;
    private i2cAddress = 0x38;
    private isAddressed = false;
    private i2cRegister = 0;
    private awaitingRegister = true;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { buffer: this.vram, powerOn: true, t: Date.now() };
    }

    // Touch interaction from UI
    public setTouchPoint(x: number, y: number, isDown: boolean) {
        this.touchX = Math.floor(x);
        this.touchY = Math.floor(y);
        this.isTouched = isDown;
    }

    update(cpuCycles: number) {
        const now = Date.now();
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

        if (this.vramDirty || (now - this.lastSync > 100)) {
            this.lastSync = now;
            this.vramDirty = false;
            this.stateChanged = true;
        }
    }

    // SPI logic
    onPinStateChange(pinId: string, isHigh: boolean) {
        if (pinId === 'DC') this.dcHigh = isHigh;
        else if (pinId === 'CS') {
            this.csHigh = isHigh;
            if (isHigh) {
                this.params = [];
                this.secondByte = false;
            }
        }
        else if (pinId === 'RESET' && !isHigh) {
            this.vram.fill(0);
            this.vramDirty = true;
        }
    }

    onSPIByte(data: number) {
        if (this.csHigh || !this.powerOn) return 0xFF;

        if (!this.dcHigh) {
            this.currentCommand = data;
            this.params = [];
            this.secondByte = false;
            if (data === 0x2C) { // RAMWR
                this.currentX = this.colStart;
                this.currentY = this.rowStart;
            }
        } else {
            this.handleDataByte(data);
        }
        return 0x00;
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

    // I2C logic for FT6206
    onI2CStart(addr: number, read: boolean) {
        if (addr === this.i2cAddress) {
            this.isAddressed = true;
            this.awaitingRegister = !read;
            return true;
        }
        this.isAddressed = false;
        return false;
    }

    onI2CByte(addr: number, data: number) {
        if (!this.isAddressed) return false;
        if (this.awaitingRegister) {
            this.i2cRegister = data;
            this.awaitingRegister = false;
            return true;
        }
        // Write to register not really needed for simple touch simulation
        return true;
    }

    onI2CByteRead(addr: number): number {
        if (!this.isAddressed) return 0xFF;

        let res = 0;
        // Basic FT6206 implementation
        switch (this.i2cRegister) {
            case 0x02: // TD_STATUS (number of touch points)
                res = this.isTouched ? 1 : 0;
                break;
            case 0x03: // P1_XH (X high, plus event flag)
                // Event flag = 0 (put down) or 2 (contact)
                res = ((this.touchX >> 8) & 0x0F) | (this.isTouched ? 0x80 : 0); // 0x80 is contact
                break;
            case 0x04: // P1_XL (X low)
                res = this.touchX & 0xFF;
                break;
            case 0x05: // P1_YH (Y high, plus touch ID)
                res = (this.touchY >> 8) & 0x0F;
                break;
            case 0x06: // P1_YL (Y low)
                res = this.touchY & 0xFF;
                break;
            default:
                res = 0;
                break;
        }
        this.i2cRegister++; // Auto-increment register on read
        return res;
    }

    onI2CStop() {
        this.isAddressed = false;
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
            touchActive: this.isTouched,
            touchX: this.touchX,
            touchY: this.touchY
        });
    }
}
