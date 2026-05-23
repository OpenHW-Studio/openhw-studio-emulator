import { BaseComponent } from '../BaseComponent';

export class Dipswitch8Logic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = {
            switches: ['off', 'off', 'off', 'off', 'off', 'off', 'off', 'off']
        };
    }

    getMnaStamps() {
        const stamps = [];
        for (let i = 0; i < 8; i++) {
            const isClosed = this.state.switches[i] === 'on';
            const conductance = isClosed ? 1000 : 1e-9;
            stamps.push({
                pins: [`${i + 1}`, `${i + 1}B`],
                g: conductance
            });
        }
        return stamps;
    }

    onEvent(event: string) {
        if (event.startsWith('toggle:')) {
            const idx = parseInt(event.split(':')[1], 10);
            if (idx >= 0 && idx < 8) {
                const nextSwitches = [...this.state.switches];
                nextSwitches[idx] = nextSwitches[idx] === 'on' ? 'off' : 'on';
                this.setState({ switches: nextSwitches });
                this.stateChanged = true;
            }
        } else if (event.startsWith('set:')) {
            const parts = event.split(':');
            const idx = parseInt(parts[1], 10);
            const val = parts[2];
            if (idx >= 0 && idx < 8 && (val === 'on' || val === 'off')) {
                const nextSwitches = [...this.state.switches];
                nextSwitches[idx] = val;
                this.setState({ switches: nextSwitches });
                this.stateChanged = true;
            }
        }
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            switches: this.state.switches.join(','),
            closedCount: this.state.switches.filter((s: string) => s === 'on').length
        });
    }
}
