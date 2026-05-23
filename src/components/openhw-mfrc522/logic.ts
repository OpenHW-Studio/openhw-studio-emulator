import { BaseComponent } from '../BaseComponent';
import { SPIProtocol } from '../../protocol-handlers/index';

// MFRC522 — SPI RFID Reader
// Operates at 13.56 MHz, reading Mifare Classic cards/tags.
//
// Hardware:
//   - Requires 3.3V (5V will damage the chip)
//   - SPI: MISO, MOSI, SCK, SDA/CS, RST
//   - Simulated at library abstraction level.
//
// SPI register-map protocol (used by MFRC522 library):
//   Byte 0: [R/W bit (7)] [Register addr (6:1)] [0]
//   Read:  bit7=1, write: bit7=0
//
// Key simulation hooks:
//   - cardPresent / cardUID are set via UI events
//   - onSPIByteExchange handles the read/write register protocol

const REG_VERSION   = 0x37; // Chip version → 0x92 (MFRC522)
const REG_STATUS2   = 0x0A;
const REG_COMIRQ    = 0x04;
const REG_FIFOLEVEL = 0x0A;
const REG_FIFODATA  = 0x09;

export class MFRC522Logic extends SPIProtocol {
    private cardPresent = false;
    private cardUID: string = 'DE AD BE EF';
    private powered = false;

    // Simulated register map
    private regs: Record<number, number> = {
        0x37: 0x92,  // VERSION → MFRC522 v2
        0x00: 0x00,  // CommandReg (idle)
        0x04: 0x00,  // ComIrqReg
        0x0A: 0x00,  // ErrorReg / FIFOLevelReg (cleared)
    };

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.cardPresent = manifest.attrs?.cardPresent === 'true';
        this.cardUID = manifest.attrs?.cardUID ?? 'DE AD BE EF';
        this.state = {
            ...this.state,
            powered: false,
            cardPresent: this.cardPresent,
            cardUID: this.cardUID,
        };
    }

    getCSPinName(): string { return 'SDA'; }

    // Full-duplex byte-exchange hook
    onSPIByteExchange(byte: number, byteIndex: number): number {
        if (byteIndex === 0) {
            // Address byte: bit7=R/W, bits[6:1]=address, bit0=0
            const isRead = (byte & 0x80) !== 0;
            const reg = (byte >> 1) & 0x3F;

            if (isRead) {
                // For reads, the next byte clocked in is 0x00 and we return the register
                return this.regs[reg] ?? 0x00;
            }
            // Write: MISO returns 0x00, data follows in next byte
            return 0x00;
        } else {
            // Data byte for a write — store it
            const prevByte = this.currentFrame[0];
            const isRead = (prevByte & 0x80) !== 0;
            if (!isRead) {
                const reg = (prevByte >> 1) & 0x3F;
                this.regs[reg] = byte & 0xFF;
            }
            return 0x00;
        }
    }

    onEvent(event: any) {
        if (event.type === 'card-toggle') {
            this.cardPresent = event.value;
            this.setState({ cardPresent: this.cardPresent });
        } else if (event.type === 'uid-change') {
            this.cardUID = event.value;
            this.setState({ cardUID: this.cardUID });
        }
    }

    update(cpuCycles: number, wires: any[], instances: BaseComponent[]) {
        const vcc = this.getPinVoltage('3V3') || this.getPinVoltage('VCC');
        const wasPowered = this.powered;
        this.powered = vcc > 2.5;
        if (this.powered !== wasPowered) {
            this.setState({
                powered: this.powered,
                cardPresent: this.powered ? this.cardPresent : false,
                cardUID: this.cardUID,
            });
        }
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            powered:     Boolean(this.state.powered),
            cardPresent: Boolean(this.state.cardPresent),
            cardUID:     String(this.state.cardUID || 'None'),
        });
    }
}
