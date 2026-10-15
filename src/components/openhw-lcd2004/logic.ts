import { BaseComponent } from '../BaseComponent';
import { HD44780Controller } from '../../protocol-handlers/hd44780-controller';

// openhw-lcd2004 (parallel, no I2C backpack): 4x20 character LCD driven
// over RS/RW/E + D4–D7 in 4-bit mode (LiquidCrystal default wiring).
// Mirrors Lcd1602Logic with 4 rows / 20 cols.
export class Lcd2004ParallelLogic extends BaseComponent {
    private hd44780 = new HD44780Controller(4, 20);
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
            lineCount: 4,
            charsPerLine: 20,
        });
    }

    getSyncState() {
        return { ...this.state };
    }

    // 12.4 v2: numeric UI state for SAB slot {i0: backlight} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {},
            i: {backlight: (s.backlight ? 1 : 0)},
        };
    }
    validate(_component: any, _graph: Map<string, string[]>) {
        return null;
    }
}
