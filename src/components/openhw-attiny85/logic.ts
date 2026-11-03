import { BaseComponent } from '../BaseComponent';

export class ATtiny85Logic extends BaseComponent {
    private ledTimeout: any = null;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = {
            ledActive: false,
            ...this.state
        };
    }

    onPinStateChange(pinId: string, isHigh: boolean, cpuCycles: number) {
        // Built-in LED is on P1
        if (pinId === 'P1' || pinId === '1') {
            this.setState({ ledActive: isHigh });
        }
    }

    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        // CPU driven pins are handled by the core emulator
    }

    // 12.4 v2: numeric UI state for SAB slot {i0: ledActive} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {},
            i: {ledActive: (s.ledActive ? 1 : 0)},
        };
    }
    validate(_component: any, _graph: Map<string, string[]>) {
        return null;
    }
}
