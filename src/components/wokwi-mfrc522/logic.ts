import { BaseComponent } from '../BaseComponent';

// MFRC522 RFID Reader — SPI interface
//
// Real hardware behaviour:
//   - Communicates over SPI (MISO/MOSI/SCK/SDA as chip select)
//   - Operates at 3.3V ONLY — 5V will damage the chip
//   - Reads Mifare Classic 1K cards (7-byte or 4-byte UID)
//   - Arduino uses the MFRC522 library: rfid.PICC_IsNewCardPresent(), rfid.PICC_ReadCardSerial()
//
// Simulation:
//   - User can set a UID in attrs/context menu
//   - Toggling 'cardPresent' simulates placing/removing a card
//   - SPI byte responses are simplified to return UID bytes

export class MFRC522Logic extends BaseComponent {
    private cardPresent: boolean = false;
    private cardUID: number[] = [0xDE, 0xAD, 0xBE, 0xEF];
    private powered: boolean = false;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.cardPresent = manifest.attrs?.cardPresent === 'true';
        this.cardUID = this.parseUID(manifest.attrs?.cardUID ?? 'DE AD BE EF');

        this.state = {
            powered:     false,
            cardPresent: this.cardPresent,
            cardUID:     manifest.attrs?.cardUID ?? 'DE AD BE EF',
        };
    }

    private parseUID(uid: string): number[] {
        return uid.trim().split(/\s+/).map(b => parseInt(b, 16)).filter(n => !isNaN(n));
    }

    onEvent(event: any) {
        if (event.type === 'card-toggle') {
            this.cardPresent = !this.cardPresent;
            this.setState({ cardPresent: this.cardPresent });
        }
        if (event.type === 'uid-change') {
            this.cardUID = this.parseUID(event.value);
            this.setState({ cardUID: event.value });
        }
    }

    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        const vcc = this.getPinVoltage('VCC');
        this.powered = vcc >= 1.8 && vcc <= 3.6; // 3.3V only

        this.setState({
            powered:     this.powered,
            cardPresent: this.cardPresent,
            cardUID:     this.cardUID.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' '),
        });
    }

    // SPI byte handler — returns UID bytes when card is present
    onSPIByte(data: number): number {
        if (!this.powered || !this.cardPresent) return 0xFF;
        // Simplified: return UID bytes cycling
        return this.cardUID[data % this.cardUID.length] ?? 0xFF;
    }
}
