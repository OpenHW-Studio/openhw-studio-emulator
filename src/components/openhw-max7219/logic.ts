import { BaseComponent } from '../BaseComponent';
import { SPIProtocol } from '../../protocol-handlers/index';

// MAX7219 — 8×8 LED Matrix / 7-Segment Driver (SPI, active-LOW CS / LOAD)
//
// SPI framing:
//   16-bit per frame: [ADDR 8-bit] [DATA 8-bit]
//   CS (LOAD) is normally active-LOW, data latches on CS rising edge.
//   Supports daisy-chaining (DOUT = MISO passthrough).
//
// Key registers:
//   0x01–0x08: Row data
//   0x09: Decode mode
//   0x0A: Intensity
//   0x0B: Scan limit
//   0x0C: Shutdown (0=off, 1=normal)
//   0x0F: Display test

export class MAX7219Logic extends SPIProtocol {
    private matrixData: number[] = new Array(8).fill(0);
    private shutdown = true;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { ...this.state, matrix: [...this.matrixData], active: false };
    }

    // MAX7219 uses CS/LOAD active-LOW, latches on CS rising edge (deassert)
    onCSDeassert(meta: any): void {
        const frame = meta.frame;
        if (frame.length < 2) return;

        // MAX7219 is 16-bit per command (address + data)
        for (let i = 0; i + 1 < frame.length; i += 2) {
            const address = frame[i] & 0x0F;
            const value   = frame[i + 1] & 0xFF;
            this._execute(address, value);
        }

        // Daisy-chain passthrough
        this.setPinVoltage('DOUT', 0.0);
    }

    private _execute(address: number, value: number) {
        if (address >= 0x01 && address <= 0x08) {
            this.matrixData[address - 1] = value;
        } else if (address === 0x0C) {
            this.shutdown = (value === 0);
        } else if (address === 0x0F) {
            this.matrixData.fill(value ? 0xFF : 0);
        }
        this.setState({ matrix: [...this.matrixData], active: !this.shutdown });
    }

    // Bit-banging state for LedControl
    private clkLast = false;
    private dinHigh = false;
    private currentByte = 0;
    private bitsReceived = 0;

    // Passthrough clock & CS to daisy-chain output and decode bit-banging
    onPinStateChange(pinId: string, isHigh: boolean, cpuCycles: number) {
        super.onPinStateChange(pinId, isHigh, cpuCycles);
        const v = isHigh ? 5.0 : 0.0;

        // Track DIN digital state so bit-banging works on 3.3V boards (ESP32/Pico)
        if (pinId === 'DIN') this.dinHigh = isHigh;

        if (pinId === 'CS')  this.setPinVoltage('CS_OUT', v);
        if (pinId === 'CLK') this.setPinVoltage('CLK_OUT', v);

        // Bit-banging decode (LedControl uses MSB first, latch on rising edge)
        if (pinId === 'CLK') {
            const rising = isHigh && !this.clkLast;
            this.clkLast = isHigh;

            if (rising && this.csActive) {
                const dinBit = (this.dinHigh || this.getPinVoltage('DIN') > 0.5) ? 1 : 0;
                this.currentByte = ((this.currentByte << 1) | dinBit) & 0xFF;
                this.bitsReceived++;

                if (this.bitsReceived === 8) {
                    this.onSPIByte(this.currentByte);
                    this.bitsReceived = 0;
                    this.currentByte = 0;
                }
            }
        }

        if (pinId === 'CS' && !isHigh) {
            // Reset bit-banging state when CS goes active (LOW)
            this.bitsReceived = 0;
            this.currentByte = 0;
        }
    }

    getSyncState() { return { ...this.state }; }
}
