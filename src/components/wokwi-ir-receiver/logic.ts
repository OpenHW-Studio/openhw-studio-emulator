import { BaseComponent } from '../BaseComponent';

// IR Receiver (TSOP38238 / VS1838B style) — 38kHz IR demodulator
//
// Real hardware behaviour:
//   - Receives modulated 38kHz IR signals and outputs a clean digital signal
//   - Output is ACTIVE LOW — idle state is HIGH, signal bursts pull it LOW
//   - Arduino uses the IRremote library to decode NEC / Sony / RC5 protocols
//   - Typical sketch:
//       #include <IRremote.h>
//       IRrecv irrecv(11);
//       decode_results results;
//       irrecv.enableIRIn();
//       if (irrecv.decode(&results)) {
//         Serial.println(results.value, HEX);
//         irrecv.resume();
//       }
//
// Simulation approach:
//   - The user selects a remote button from a virtual remote in the UI
//   - We simulate the NEC protocol pulse train on the OUT pin
//   - NEC protocol: 9ms AGC burst, 4.5ms space, then 32 bits (address + command)
//   - Each bit: 562.5µs mark, then 562.5µs (0) or 1687.5µs (1) space
//   - At 16MHz: 562.5µs = 9000 cycles, 1687.5µs = 27000 cycles

// Common NEC remote control codes (Samsung-style remote)
const NEC_CODES: Record<string, number> = {
    'POWER':    0xE0E040BF,
    'VOL+':     0xE0E0E01F,
    'VOL-':     0xE0E0D02F,
    'CH+':      0xE0E048B7,
    'CH-':      0xE0E008F7,
    'MUTE':     0xE0E0F00F,
    '0':        0xE0E08877,
    '1':        0xE0E020DF,
    '2':        0xE0E0A05F,
    '3':        0xE0E0609F,
    '4':        0xE0E010EF,
    '5':        0xE0E0906F,
    '6':        0xE0E050AF,
    '7':        0xE0E030CF,
    '8':        0xE0E0B04F,
    '9':        0xE0E0708F,
    'OK':       0xE0E016E9,
    'UP':       0xE0E006F9,
    'DOWN':     0xE0E08679,
    'LEFT':     0xE0E0A659,
    'RIGHT':    0xE0E046B9,
};

// NEC timing in CPU cycles at 16MHz
const CYCLES_PER_US = 16;                        // 16 cycles = 1 µs
const AGC_MARK      = 9000  * CYCLES_PER_US;     // 9ms leader mark
const AGC_SPACE     = 4500  * CYCLES_PER_US;     // 4.5ms leader space
const BIT_MARK      = 562   * CYCLES_PER_US;     // 562µs bit mark
const ONE_SPACE     = 1687  * CYCLES_PER_US;     // 1687µs = bit 1
const ZERO_SPACE    = 562   * CYCLES_PER_US;     // 562µs  = bit 0
const STOP_MARK     = 562   * CYCLES_PER_US;     // final stop bit

export class IRReceiverLogic extends BaseComponent {
    private powered:        boolean  = false;
    private transmitting:   boolean  = false;
    private pulseQueue:     { high: boolean; cycles: number }[] = [];
    private currentPulse:   { high: boolean; cycles: number } | null = null;
    private remainingCycles: number  = 0;
    private lastCode:       string   = '';
    private lastValue:      number   = 0;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = {
            powered:      false,
            transmitting: false,
            lastButton:   '',
            lastValue:    0,
        };
    }

    // Called when user clicks a button on the virtual remote in the UI
    onEvent(event: any) {
        if (event.type === 'ir-send') {
            const code = NEC_CODES[event.button];
            if (code !== undefined && this.powered && !this.transmitting) {
                this.lastCode  = event.button;
                this.lastValue = code;
                this.buildNECPulseQueue(code);
                this.transmitting = true;
                this.setState({ transmitting: true, lastButton: event.button, lastValue: code });
            }
        }
    }

    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        const vcc = this.getPinVoltage('VCC');
        this.powered = vcc >= 2.5;

        if (!this.powered) {
            this.setPinVoltage('OUT', 0);
            this.setState({ powered: false });
            return;
        }

        this.setState({ powered: true });

        if (!this.transmitting) {
            // Idle: OUT pin is HIGH (active-low receiver)
            this.setPinVoltage('OUT', 5.0);
            return;
        }

        // Drive the current pulse
        this.remainingCycles -= cpuCycles;

        if (this.remainingCycles <= 0) {
            // Move to next pulse
            const next = this.pulseQueue.shift();
            if (!next) {
                // Transmission complete
                this.transmitting = false;
                this.currentPulse = null;
                this.setPinVoltage('OUT', 5.0);
                this.setState({ transmitting: false });
                return;
            }
            this.currentPulse    = next;
            this.remainingCycles = next.cycles;
        }

        if (this.currentPulse) {
            // NEC output is ACTIVE LOW: mark = LOW, space = HIGH
            this.setPinVoltage('OUT', this.currentPulse.high ? 0 : 5.0);
        }
    }

    // Build a full NEC protocol pulse sequence for a 32-bit code
    private buildNECPulseQueue(code: number) {
        this.pulseQueue = [];

        // AGC leader
        this.pulseQueue.push({ high: true,  cycles: AGC_MARK  });
        this.pulseQueue.push({ high: false, cycles: AGC_SPACE });

        // 32 data bits, MSB first
        for (let i = 31; i >= 0; i--) {
            const bit = (code >> i) & 1;
            this.pulseQueue.push({ high: true,  cycles: BIT_MARK });
            this.pulseQueue.push({ high: false, cycles: bit === 1 ? ONE_SPACE : ZERO_SPACE });
        }

        // Stop bit
        this.pulseQueue.push({ high: true, cycles: STOP_MARK });

        // Start the first pulse
        const first = this.pulseQueue.shift()!;
        this.currentPulse    = first;
        this.remainingCycles = first.cycles;
    }
}

export { NEC_CODES };
