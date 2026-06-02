import { BaseComponent } from '../BaseComponent';
import { SPIProtocol } from '../../protocol-handlers/index';

// MFRC522 — SPI RFID Reader simulation
// Simulates the MFRC522 register-map protocol at library-abstraction level.
//
// SPI register encoding (MFRC522 datasheet §8.1.2):
//   Byte 0: bit7=RW (1=read, 0=write), bits[6:1]=address, bit0=0
//
// The Arduino MFRC522 library flow for PICC_IsNewCardPresent():
//   1. PCD_ClearRegisterBitMask(CollReg, 0x80) → write CollReg
//   2. PCD_Transceive with REQA command (0x26)
//      - Write CommandReg = PCD_Idle (0x00)
//      - Write ComIEnReg
//      - Write ComIrqReg = 0x7F (clear)
//      - Write FIFOLevelReg = 0x80 (flush)
//      - Write FIFODataReg = 0x26
//      - Write BitFramingReg = 0x07
//      - Write CommandReg = PCD_Transceive (0x0C)
//      - Poll ComIrqReg until RxIRq (bit5) or IdleIRq (bit4) or TimerIRq (bit0)
//      - Read FIFOLevelReg for byte count
//      - Read FIFODataReg bytes → ATQA

// Register addresses
const REG_COMMAND     = 0x01; // CommandReg
const REG_COMEN       = 0x02; // ComIEnReg
const REG_COMIRQ      = 0x04; // ComIrqReg
const REG_ERROR       = 0x06; // ErrorReg
const REG_STATUS1     = 0x07; // Status1Reg
const REG_STATUS2     = 0x08; // Status2Reg
const REG_FIFODATA    = 0x09; // FIFODataReg
const REG_FIFOLEVEL   = 0x0A; // FIFOLevelReg
const REG_BITFRAMING  = 0x0D; // BitFramingReg
const REG_COLL        = 0x0E; // CollReg
const REG_VERSION     = 0x37; // VersionReg → 0x92

// PCD commands
const CMD_IDLE        = 0x00;
const CMD_TRANSCEIVE  = 0x0C;

// Mifare PICC commands
const PICC_REQA       = 0x26;
const PICC_WUPA       = 0x52;

// ATQA response for Mifare Classic 1K
const ATQA_HI = 0x00;
const ATQA_LO = 0x04;

export class MFRC522Logic extends SPIProtocol {
    private cardPresent = false;
    private cardUID: string = 'DE AD BE EF';
    private powered = false;

    // Internal register file
    private regs: Record<number, number> = {};

    // FIFO buffer (simulated)
    private fifo: number[] = [];
    // Set true after a successful REQA/WUPA when cardPresent; library reads ATQA from FIFO
    private fifoReadIndex = 0;
    // Tracks whether a Transceive command with REQA is in progress
    private transceiveActive = false;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.cardPresent = manifest.attrs?.cardPresent === 'true';
        this.cardUID = manifest.attrs?.cardUID ?? 'DE AD BE EF';
        this._resetRegs();
        this.state = {
            ...this.state,
            powered: false,
            cardPresent: this.cardPresent,
            cardUID: this.cardUID,
        };
    }

    private _resetRegs() {
        this.regs = {};
        this.regs[REG_VERSION]    = 0x92; // MFRC522 v2
        this.regs[REG_COMMAND]    = CMD_IDLE;
        this.regs[REG_COMIRQ]     = 0x00;
        this.regs[REG_ERROR]      = 0x00;
        this.regs[REG_STATUS1]    = 0x00;
        this.regs[REG_STATUS2]    = 0x00;
        this.regs[REG_FIFODATA]   = 0x00;
        this.regs[REG_FIFOLEVEL]  = 0x00;
        this.regs[REG_BITFRAMING] = 0x00;
        this.regs[REG_COLL]       = 0x00;
        this.fifo = [];
        this.fifoReadIndex = 0;
        this.transceiveActive = false;
    }

    getCSPinName(): string { return 'SDA'; }

    // ── SPI byte-exchange hook ──────────────────────────────────────────────
    onSPIByteExchange(byte: number, byteIndex: number): number {
        if (byteIndex === 0) {
            // Address byte
            return 0x00; // MISO during address phase is don't-care
        }

        // Data byte — decode address from first byte of current frame
        const addrByte = this.currentFrame[0] ?? 0;
        const isRead   = (addrByte & 0x80) !== 0;
        const reg      = (addrByte >> 1) & 0x3F;

        if (isRead) {
            return this._readReg(reg);
        } else {
            this._writeReg(reg, byte & 0xFF);
            return 0x00;
        }
    }

    private _readReg(reg: number): number {
        switch (reg) {
            case REG_COMIRQ:
                // Return interrupt flags. If transceive is active and card is present,
                // signal RxIRq (bit5) + IdleIRq (bit4) to unblock the library's poll loop.
                // Without a card, signal only TimerIRq (bit0) so the library returns false.
                if (this.transceiveActive) {
                    return this.cardPresent ? 0x30 : 0x01; // RxIRq+IdleIRq or TimerIRq
                }
                return this.regs[REG_COMIRQ] ?? 0x00;

            case REG_FIFOLEVEL:
                return this.fifo.length & 0xFF;

            case REG_FIFODATA:
                // Return next byte from FIFO (ATQA bytes or UID bytes)
                if (this.fifo.length > 0) {
                    return this.fifo.shift()!;
                }
                return 0x00;

            case REG_ERROR:
                // No errors when card is present, CollErr when not
                return this.transceiveActive && !this.cardPresent ? 0x08 : 0x00;

            case REG_STATUS2:
                // MFCrypto1On bit (bit3) — not set after REQA
                return 0x00;

            default:
                return this.regs[reg] ?? 0x00;
        }
    }

    private _writeReg(reg: number, value: number) {
        this.regs[reg] = value;

        switch (reg) {
            case REG_FIFOLEVEL:
                // Writing 0x80 to FIFOLevelReg flushes the FIFO
                if (value & 0x80) {
                    this.fifo = [];
                    this.fifoReadIndex = 0;
                }
                break;

            case REG_FIFODATA:
                // Master is writing a byte to FIFO (the REQA/WUPA command byte)
                this.fifo.push(value);
                break;

            case REG_COMMAND:
                if (value === CMD_TRANSCEIVE) {
                    // Decode what command was queued in FIFO
                    const queued = this.fifo[this.fifo.length - 1];
                    this.fifo = []; // Clear TX data; FIFO will now hold RX data

                    if (queued === PICC_REQA || queued === PICC_WUPA) {
                        this.transceiveActive = true;
                        if (this.cardPresent) {
                            // Populate FIFO with ATQA for Mifare Classic 1K (2 bytes)
                            this.fifo = [ATQA_LO, ATQA_HI];
                            this.regs[REG_COMIRQ] = 0x30; // RxIRq + IdleIRq
                        } else {
                            this.regs[REG_COMIRQ] = 0x01; // TimerIRq only
                        }
                    } else {
                        // Other Transceive commands (anti-collision, select, auth...)
                        // Just signal completion with no error
                        this.transceiveActive = true;
                        if (this.cardPresent) {
                            // For ANTICOLL / SELECT: return UID bytes
                            const uidBytes = this._getUIDBytes();
                            this.fifo = [...uidBytes, this._uidBCC(uidBytes)];
                            this.regs[REG_COMIRQ] = 0x30;
                        } else {
                            this.regs[REG_COMIRQ] = 0x01;
                        }
                    }
                } else if (value === CMD_IDLE) {
                    this.transceiveActive = false;
                }
                break;

            case REG_COMIRQ:
                // Writing 0x7F clears all interrupt flags
                if (value === 0x7F) {
                    this.regs[REG_COMIRQ] = 0x00;
                    this.transceiveActive = false;
                }
                break;
        }
    }

    private _getUIDBytes(): number[] {
        // Parse UID string like "DE AD BE EF" → [0xDE, 0xAD, 0xBE, 0xEF]
        const parts = String(this.cardUID || 'DE AD BE EF').trim().split(/\s+/);
        return parts.map(p => parseInt(p, 16) & 0xFF).filter(n => !isNaN(n));
    }

    private _uidBCC(uid: number[]): number {
        // BCC = XOR of all UID bytes
        return uid.reduce((acc, b) => acc ^ b, 0) & 0xFF;
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
        // Accept both '3V3' pin name and 'VCC' as power sources
        const vcc = this.getPinVoltage('3V3') || this.getPinVoltage('VCC') || this.getPinVoltage('vcc');
        const wasPowered = this.powered;
        this.powered = vcc > 2.5;
        if (this.powered !== wasPowered) {
            if (!this.powered) {
                this._resetRegs();
            }
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
