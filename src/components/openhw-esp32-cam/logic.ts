import { BaseComponent } from '../BaseComponent';

export class Esp32CamLogic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
    }
    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        // Core operations run remotely in QEMU.
        // We only provide logical wire anchoring.
    }
}
