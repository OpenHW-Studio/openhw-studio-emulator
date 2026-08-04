import { BaseComponent } from '../BaseComponent';

export class Pushbutton6mmLogic extends BaseComponent {
    private pressCount = 0;
    private lastPressedState = false;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { pressed: false };
    }

    getMnaPins() { return ['1A', '1B', '2A', '2B']; }
    getMnaStamps() {
        const switchConductance = this.state.pressed ? 1000 : 1e-9;
        return [
            { pins: ['1A', '1B'], g: 1000 },
            { pins: ['2A', '2B'], g: 1000 },
            { pins: ['1A', '2A'], g: switchConductance }
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
