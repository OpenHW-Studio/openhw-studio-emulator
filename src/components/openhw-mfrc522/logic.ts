import { BaseComponent } from '../BaseComponent';

// MFRC522 — SPI RFID Reader
// Operates at 13.56 MHz, reading Mifare Classic cards/tags.
//
// Hardware Behaviour:
//   - Requires 3.3V power (5V will damage the real chip)
//   - Communicates via SPI (MISO, MOSI, SCK, SDA/CS, RST)
//   - When a card is present, PICC_IsNewCardPresent() returns true
//   - PICC_ReadCardSerial() populates rfid.uid struct
//
// Simulation approach:
//   - Simulated at library abstraction level.
//   - We maintain cardPresent and cardUID in state.
//   - The engine injects these into the MFRC522 library responses.

export class MFRC522Logic extends BaseComponent {
    private cardPresent: boolean = false;
    private cardUID: string = 'DE AD BE EF';

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.cardPresent = manifest.attrs?.cardPresent === 'true';
        this.cardUID = manifest.attrs?.cardUID ?? 'DE AD BE EF';
        this.state = {
            powered: false,
            cardPresent: this.cardPresent,
            cardUID: this.cardUID,
        };
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

    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        // Robust power check: check both 3V3 and VCC pins
        const vcc = this.getPinVoltage('3V3') || this.getPinVoltage('VCC');
        const isPowered = vcc > 2.5;

        this.setState({
            powered: isPowered,
            cardPresent: isPowered ? this.cardPresent : false,
            cardUID: this.cardUID,
        });
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            powered: Boolean(this.state.powered),
            cardPresent: Boolean(this.state.cardPresent),
            cardUID: String(this.state.cardUID || 'None'),
        });
    }
}
