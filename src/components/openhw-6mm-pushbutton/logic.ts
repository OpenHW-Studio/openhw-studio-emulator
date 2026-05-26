import { BaseComponent } from '../BaseComponent';

export class Pushbutton6mmLogic extends BaseComponent {
    private pressCount = 0;
    private lastPressedState = false;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { pressed: false };
    }

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
            this.setPinVoltage('1A', 0);
            this.setPinVoltage('1B', 0);
            this.setPinVoltage('2A', 0);
            this.setPinVoltage('2B', 0);
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
