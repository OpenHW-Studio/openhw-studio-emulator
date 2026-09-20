import { BaseComponent } from '../BaseComponent';

export class SlideSwitchLogic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { value: manifest.attrs?.value || "" };
    }

    getMnaPins() { return ['1', '2', '3']; }

    getMnaStamps() {
        const shortCond = 1000; // 0.001 ohm internal connection
        const openCond = 1e-9;
        const isRight = this.state.value === "1" || this.state.value === 1;

        console.log(`[SlideSwitchLogic] getMnaStamps() called. state.value=${this.state.value}, isRight=${isRight}`);

        return [
            // Left position: 1 <-> 2 shorted, 3 <-> 2 open
            // Right position: 1 <-> 2 open, 3 <-> 2 shorted
            { pins: ['1', '2'], g: isRight ? openCond : shortCond },
            { pins: ['3', '2'], g: isRight ? shortCond : openCond }
        ];
    }

    getSyncState() {
        return { value: this.state.value };
    }

    // 12.4 v2: numeric UI state for SAB slot { i0: value }.
    // state.value is "0"/"1" (string); map to 0/1 via Number().
    uiState() {
        return {
            f: {},
            i: { value: Number(this.state?.value) === 1 ? 1 : 0 },
        };
    }

    validate(_component: any, _graph: Map<string, string[]>) {
        return null;
    }

    onEvent(event: any) {
        console.log(`[SlideSwitchLogic] onEvent called with:`, event);
        if (event === 'set_1') {
            this.setState({ value: "1" });
            this.stateChanged = true;
        } else if (event === 'set_0') {
            this.setState({ value: "0" });
            this.stateChanged = true;
        } else if (event && typeof event === 'object' && event.type === 'input' && event.value !== undefined) {
            const newValue = String(event.value);
            this.setState({ value: newValue });
            this.stateChanged = true;
        } else if (event === 'toggle') {
            const isRight = this.state.value === "1" || this.state.value === 1;
            const newValue = isRight ? "0" : "1";
            this.setState({ value: newValue });
            this.stateChanged = true;
        }
        console.log(`[SlideSwitchLogic] State updated to: ${this.state.value}`);
    }
}
