import { BaseComponent } from '../BaseComponent';

// IR Receiver (e.g. VS1838B)
// Demodulates 38 kHz infrared signals and outputs active-LOW digital pulses.
//
// Virtual Remote NEC Codes (Samsung style):
const NEC_CODES: Record<string, number> = {
    'POWER': 0xE0E040BF,
    'VOL+':  0xE0E0E01F,
    'VOL-':  0xE0E0D02F,
    'MUTE':  0xE0E0F00F,
    'CH+':   0xE0E048B7,
    'CH-':   0xE0E008F7,
    'OK':    0xE0E016E9,
    'UP':    0xE0E006F9,
    'DOWN':  0xE0E08679,
    'LEFT':  0xE0E0A659,
    'RIGHT': 0xE0E046B9,
    '1':     0xE0E020DF,
    '2':     0xE0E0A05F,
    '3':     0xE0E0609F,
    '4':     0xE0E010EF,
    '5':     0xE0E0906F,
    '6':     0xE0E050AF,
    '7':     0xE0E030CF,
    '8':     0xE0E0B04F,
    '9':     0xE0E0708F,
    '0':     0xE0E08877,
};

export class IRReceiverLogic extends BaseComponent {
    private frequency: number = 38; // kHz
    private transmitting: boolean = false;
    private transmitEndCycle: number = 0;
    private lastButton: string = '';
    private lastValue: number = 0;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.frequency = parseInt(manifest.attrs?.frequency ?? '38', 10);
        this.state = {
            powered: false,
            transmitting: false,
            lastButton: '',
            lastValue: '0x00000000',
        };
    }

    onEvent(event: any) {
        if (event.type === 'ir-send' && this.state.powered) {
            const btn = event.button;
            const code = NEC_CODES[btn];
            if (code !== undefined) {
                this.lastButton = btn;
                this.lastValue = code;
                this.transmitting = true;
                // Keep the transmitting LED lit and pin LOW for ~200ms (assuming 16MHz CPU = 3.2M cycles)
                this.transmitEndCycle = (this as any).lastCpuCycles + 3200000;

                this.setState({
                    powered: true,
                    transmitting: true,
                    lastButton: btn,
                    lastValue: `0x${code.toString(16).toUpperCase()}`,
                });
            }
        }
    }

    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        (this as any).lastCpuCycles = cpuCycles;
        const vcc = this.getPinVoltage('VCC');
        const isPowered = vcc > 2.5;

        if (!isPowered) {
            if (this.state.powered || this.transmitting) {
                this.transmitting = false;
                this.setState({ powered: false, transmitting: false });
            }
            return;
        }

        if (this.transmitting) {
            if (cpuCycles >= this.transmitEndCycle) {
                this.transmitting = false;
                this.setPinVoltage('OUT', 5.0); // Return to idle HIGH
                this.setState({ powered: true, transmitting: false });
            } else {
                // Active LOW during burst
                this.setPinVoltage('OUT', 0.0);
            }
        } else {
            // Idle state is HIGH
            this.setPinVoltage('OUT', 5.0);
            if (!this.state.powered) {
                this.setState({ powered: true });
            }
        }
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            powered: Boolean(this.state.powered),
            transmitting: Boolean(this.state.transmitting),
            lastButton: String(this.state.lastButton || 'None'),
            lastValue: String(this.state.lastValue || '0x00000000'),
        });
    }
}
