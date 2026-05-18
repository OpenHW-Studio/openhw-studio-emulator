import { BaseComponent } from '../BaseComponent';

export class PushbuttonLogic extends BaseComponent {
    private pressCount = 0;
    private lastPressedState = false;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { pressed: false };
    }

    getMnaPins() { return ['1l', '2l', '1r', '2r']; }
    getMnaStamps() {
        const switchCond = this.state.pressed ? 1000 : 1e-9;
        const shortCond = 1000; // 0.001 ohm internal connection
        return [
            // Internal short: 1l <-> 1r
            { pins: ['1l', '1r'], g: shortCond },
            // Internal short: 2l <-> 2r
            { pins: ['2l', '2r'], g: shortCond },
            // Tactile switch: 1l <-> 2l
            { pins: ['1l', '2l'], g: switchCond }
        ];
    }

    onEvent(event: string) {
        if (event === 'press') {
            this.setState({ pressed: true });
            if (!this.lastPressedState) {
                this.pressCount++;
                this.lastPressedState = true;
                this.stateChanged = true;
            }
        } else if (event === 'release') {
            this.setState({ pressed: false });
            this.lastPressedState = false;
            this.stateChanged = true;
        }
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            pressed: this.state.pressed,
            totalPresses: this.pressCount,
            conductance: this.state.pressed ? '~1kΩ' : '∞ (open)',
        });
    }
}
