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

    // 12.4 v2: numeric UI state for SAB slot { i0: pressed }.
    uiState() {
        return {
            f: {},
            i: { pressed: this.state?.pressed ? 1 : 0 },
        };
    }

    validate(component: any, graph: Map<string, string[]>) {
        const p1a = graph.get(`${component.id}.1A`);
        const p1b = graph.get(`${component.id}.1B`);
        const p2a = graph.get(`${component.id}.2A`);
        const p2b = graph.get(`${component.id}.2B`);

        const side1Connected = Boolean((p1a && p1a.length > 0) || (p1b && p1b.length > 0));
        const side2Connected = Boolean((p2a && p2a.length > 0) || (p2b && p2b.length > 0));

        if (!side1Connected && !side2Connected) {
            return {
                ruleId: 'pushbutton6mm-floating-input-check',
                severity: 'warn',
                message: `[6mm Pushbutton ${component.id}] Warning: Button is completely disconnected.`,
                compIds: [component.id],
                remediation: 'Wire the pushbutton terminals into the circuit.',
                autoFix: true,
            };
        }

        if (side1Connected && !side2Connected) {
            return {
                ruleId: 'pushbutton6mm-floating-input-check',
                severity: 'warn',
                message: `[6mm Pushbutton ${component.id}] Warning: Only one side is connected. It will act as a floating pin.`,
                compIds: [component.id],
                remediation: 'Connect the other side (2A or 2B) to complete the circuit (e.g. to GND or a pull-down/up resistor).',
                autoFix: false,
            };
        }

        return null;
    }
}
