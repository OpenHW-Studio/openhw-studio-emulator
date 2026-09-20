import { BaseComponent } from '../BaseComponent';

export class Esp32Logic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
    }
    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        // Core operations run remotely in QEMU.
        // We only provide logical wire anchoring.
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
