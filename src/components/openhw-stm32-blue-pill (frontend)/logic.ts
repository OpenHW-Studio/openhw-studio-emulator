import { BaseComponent } from '../BaseComponent';

export class BluePillLogic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { initialized: true };
    }

    onPinStateChange(pinId: string, isHigh: boolean, cpuCycles: number) {
        // Placeholder board logic: no custom behavior yet.
        // This preserves the STM32 board type in wiring/simulation state.
    }

    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        // Intentionally empty: STM32 Blue Pill is a placeholder board in the emulator.
    }
}
