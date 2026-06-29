import { BaseComponent } from '../BaseComponent.js';

export class Esp32S31Logic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
    }
    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        // Core operations run remotely in WASM runner
    }
}
