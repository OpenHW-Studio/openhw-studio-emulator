import { BaseComponent } from '../BaseComponent';
import { SPIProtocol } from '../../protocol-handlers/index';

// Nokia 5110 / PCD8544 — 84×48 Monochrome LCD (SPI)
//
// SPI framing:
//   CS (SCE) active LOW selects the chip.
//   DC pin LOW = command byte, HIGH = data byte.
//   Data clocked in MSB-first on SCLK rising edge via DN (MOSI).
//   No MISO — write-only display.
//
// Commands of interest:
//   0x20: Function set (basic)   0x21: Function set (extended)
//   0x80|x: Set X address (0–83) 0x40|y: Set Y bank (0–5)
//   Data bytes go directly into the 504-byte framebuffer.

export class Nokia5110Logic extends SPIProtocol {
    private fb = new Uint8Array(504);
    private x = 0;
    private y = 0;

    // DC pin state — sampled before the byte is processed
    private get isDataMode(): boolean {
        return this.getPinVoltage('DC') > 2.5;
    }

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { ...this.state, fbStr: '' };
    }

    getCSPinName(): string { return 'SCE'; }

    onCSAssert(): void {
        // Nothing needed — we process bytes as they arrive
    }

    // Byte-by-byte hook: Nokia 5110 is write-only (no MISO)
    onSPIByteReceived(byte: number, byteIndex: number): void {
        if (this.isDataMode) {
            // Write to framebuffer
            if (this.x < 84 && this.y < 6) {
                this.fb[this.y * 84 + this.x] = byte;
            }
            this.x++;
            if (this.x >= 84) { this.x = 0; if (++this.y >= 6) this.y = 0; }
            this._updateFbStr();
        } else {
            // Command
            if ((byte & 0x80) === 0x80)       this.x = byte & 0x7F;  // Set X address
            else if ((byte & 0x40) === 0x40)   this.y = byte & 0x07;  // Set Y bank
            // Function set, bias, contrast etc. are accepted but ignored in simulation
        }
    }

    // Reset pin
    onPinStateChange(pinId: string, isHigh: boolean, cpuCycles: number) {
        if (pinId === 'RST' && !isHigh) {
            this.fb.fill(0);
            this.x = 0; this.y = 0;
            this._updateFbStr();
            return;
        }
        super.onPinStateChange(pinId, isHigh, cpuCycles);
    }

    private _updateFbStr() {
        let str = '';
        for (let i = 0; i < 504; i++) str += this.fb[i].toString(16).padStart(2, '0');
        this.state.fbStr = str;
        this.stateChanged = true;
    }

    onCustomTelemetry() {
        let active = 0;
        for (let i = 0; i < 504; i++) { let b = this.fb[i]; while (b > 0) { if (b & 1) active++; b >>= 1; } }
        this.setCustomTelemetry({ resolution: '84×48 mono', fillPercent: Number(((active / 4032) * 100).toFixed(1)) });
    }
}
