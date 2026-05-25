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

    onEvent(event: any) {
        // Handle both object-style events { type: 'input', value: ... }
        // and direct toggle commands
        if (event && typeof event === 'object' && event.type === 'input' && event.value !== undefined) {
            const newValue = String(event.value);
            this.setState({ value: newValue });
            this.stateChanged = true;
        } else if (typeof event === 'string') {
            // Support simple 'toggle' event
            if (event === 'toggle') {
                const isRight = this.state.value === "1" || this.state.value === 1;
                const newValue = isRight ? "" : "1";
                this.setState({ value: newValue });
                this.stateChanged = true;
            }
        }
    }
}