import { BaseComponent } from '../BaseComponent';

export class MegaLogic extends BaseComponent {
    private txTimeout: any = null;
    private rxTimeout: any = null;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = {
            txActive: false,
            rxActive: false,
            ...this.state
        };
    }

    onPinStateChange(pinId: string, isHigh: boolean, cpuCycles: number) {
        // RX is pin 0, TX is pin 1
        if (pinId === '0') {
            this.setState({ rxActive: true });
            if (this.rxTimeout) clearTimeout(this.rxTimeout);
            this.rxTimeout = setTimeout(() => {
                this.setState({ rxActive: false });
                this.rxTimeout = null;
            }, 100);
        } else if (pinId === '1') {
            this.setState({ txActive: true });
            if (this.txTimeout) clearTimeout(this.txTimeout);
            this.txTimeout = setTimeout(() => {
                this.setState({ txActive: false });
                this.txTimeout = null;
            }, 100);
        }
    }

    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        // Handled by generic avr8js
    }

    // 12.4 v2: numeric UI state for SAB slot {i0: rxActive} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {},
            i: {rxActive: (s.rxActive ? 1 : 0)},
        };
    }
    validate(_component: any, _graph: Map<string, string[]>) {
        return null;
    }
}
