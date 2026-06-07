import { BaseComponent } from '../BaseComponent';
import { SPIProtocol } from '../../protocol-handlers/index';

// NLSF595 — Serial-to-Parallel Shift Register (SPI compatible)
// 
// Operates via standard SPI modes (write-only).
// Data is shifted in on SCK rising edge (while CS is LOW).
// Outputs are latched on CS rising edge (deassert).
//
// Supports both:
//   1. Hardware SPI  — bytes arrive via onSPIByte() from the runner
//   2. Bit-bang SPI  — monitors SCK/MOSI pin changes directly (for shiftOut users)

export class NLSF595Logic extends SPIProtocol {
    private latchRegister = 0;

    // Bit-banging state (for shiftOut / software SPI support)
    private sckLast = false;
    private bbCurrentByte = 0;
    private bbBitsReceived = 0;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { r: 0, g: 0, b: 0 };
    }

    getCSPinName(): string { return 'CS'; }

    onCSDeassert(meta: any) {
        // Frame contains the bytes shifted in during this CS window
        const frame: number[] = meta.frame;
        if (frame.length === 0) return;

        // Shift register behavior: the last bytes clocked in are kept.
        // We'll extract up to 3 bytes (24 bits) for safety.
        let latch = 0;
        for (let i = Math.max(0, frame.length - 3); i < frame.length; i++) {
            latch = ((latch << 8) | (frame[i] & 0xFF)) & 0xFFFFFF;
        }

        this.latchRegister = latch;
        this.updateOutputs();
    }

    // Bit-bang fallback: decode shiftOut-style SPI from SCK/MOSI pin changes
    onPinStateChange(pinId: string, isHigh: boolean, cpuCycles: number) {
        super.onPinStateChange(pinId, isHigh, cpuCycles);

        if (pinId === 'SCK') {
            const rising = isHigh && !this.sckLast;
            this.sckLast = isHigh;

            // On SCK rising edge while CS is active, read the MOSI bit
            if (rising && this.csActive) {
                const mosiBit = this.getPinVoltage('MOSI') > 0.5 ? 1 : 0;
                this.bbCurrentByte = ((this.bbCurrentByte << 1) | mosiBit) & 0xFF;
                this.bbBitsReceived++;

                if (this.bbBitsReceived === 8) {
                    this.onSPIByte(this.bbCurrentByte);
                    this.bbBitsReceived = 0;
                    this.bbCurrentByte = 0;
                }
            }
        }

        // Reset bit-banging state when CS goes active (LOW)
        if (pinId === 'CS' && !isHigh) {
            this.bbBitsReceived = 0;
            this.bbCurrentByte = 0;
        }
    }

    private updateOutputs() {
        // Map lowest 3 bits or individual bytes depending on usage
        // Let's map Q0 to B, Q1 to G, Q2 to R
        const rVal = (this.latchRegister & 0x04) ? 5 : 0;
        const gVal = (this.latchRegister & 0x02) ? 5 : 0;
        const bVal = (this.latchRegister & 0x01) ? 5 : 0;

        this.setPinVoltage('R1', rVal);
        this.setPinVoltage('G1', gVal);
        this.setPinVoltage('B1', bVal);

        this.state.r = rVal > 2.5 ? 255 : 0;
        this.state.g = gVal > 2.5 ? 255 : 0;
        this.state.b = bVal > 2.5 ? 255 : 0;
        
        this.stateChanged = true;
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            latchRegisterHex: `0x${this.latchRegister.toString(16).padStart(6, '0')}`,
            rOutput: this.state.r > 0 ? "HIGH" : "LOW",
            gOutput: this.state.g > 0 ? "HIGH" : "LOW",
            bOutput: this.state.b > 0 ? "HIGH" : "LOW",
        });
    }
}
