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

    // 12.4 v2: numeric UI state for SAB slot { i0: pressed }.
    uiState() {
        return {
            f: {},
            i: { pressed: this.state?.pressed ? 1 : 0 },
        };
    }

    validate(component: any, graph: Map<string, string[]>) {
        const pins = ['1l', '2l', '1r', '2r'];
        const isConnected = pins.some((p) => {
            const edges = graph.get(`${component.id}.${p}`);
            return edges && edges.length > 0;
        });

        if (!isConnected) {
            return {
                ruleId: 'pushbutton-floating-input-check',
                severity: 'warn',
                message: `[Pushbutton ${component.id}] Warning: Button is completely disconnected.`,
                compIds: [component.id],
                remediation: 'Wire the pushbutton into the circuit.',
                autoFix: true,
            };
        }

        return null;
    }
}
