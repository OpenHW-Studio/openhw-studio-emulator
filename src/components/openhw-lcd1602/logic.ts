import { BaseComponent } from '../BaseComponent';
import { HD44780Controller } from '../../protocol-handlers/hd44780-controller';

export class Lcd1602Logic extends BaseComponent {
    private hd44780 = new HD44780Controller(2, 16);
    private pinStates: Record<string, boolean> = {
        rs: false, rw: false, e: false,
        d0: false, d1: false, d2: false, d3: false,
        d4: false, d5: false, d6: false, d7: false,
        a: true, k: false
    };

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { ...this.hd44780.getState() };
    }

    onPinStateChange(pinId: string, isHigh: boolean, _cpuCycles: number): void {
        const pin = pinId.toLowerCase();
        const wasHigh = this.pinStates[pin];
        this.pinStates[pin] = isHigh;

        // Backlight is driven by the A (anode) pin
        if (pin === 'a') {
            if (this.hd44780.backlight !== isHigh) {
                this.hd44780.backlight = isHigh;
                this.hd44780.stateChanged = true;
            }
        }

        // Falling edge of E latches the data nibble
        if (pin === 'e' && wasHigh && !isHigh) {
            this.hd44780.feedParallelNibble(
                this.pinStates.rs,
                this.pinStates.d4,
                this.pinStates.d5,
                this.pinStates.d6,
                this.pinStates.d7,
            );
        }

        if (this.hd44780.stateChanged) {
            this.setState({ ...this.hd44780.getState() });
            this.hd44780.clearChanged();
        }
    }

    update(cpuCycles: number, wires: any, allComponents: any) {}

    onCustomTelemetry() {
        const textContent = this.hd44780.getLines().map(l => l.trimEnd()).join('\n').trimEnd();
        this.setCustomTelemetry({
            textContent: textContent || '<empty>',
            backlight: this.hd44780.getBacklight(),
            lineCount: 2,
            charsPerLine: 16,
        });
    }

    getSyncState() {
        return { ...this.state };
    }
}
