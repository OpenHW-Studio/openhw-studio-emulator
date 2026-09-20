import { BaseComponent } from '../BaseComponent';
import { createValidationIssue } from '../component-schema.js';

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

    // 12.4 v2: numeric UI state for SAB slot {} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {},
            i: {},
        };
    }
    validate(component: any, graph: Map<string, string[]>, validator?: any) {
        const gnd = graph.get(`${component.id}.GND`);
        const vcc = graph.get(`${component.id}.3V3`);
        const hasGnd = gnd && gnd.length > 0;
        const hasVcc = vcc && vcc.length > 0;
        if (!hasGnd || !hasVcc) {
            return createValidationIssue({
                ruleId: 'stm32-blue-pill-power-check',
                severity: 'warn',
                message: `⚠️ [STM32 Blue Pill ${component.id}] Power rails are not fully connected.`,
                compIds: [component.id],
                remediation: 'Connect both 3V3 and GND to the Blue Pill board.',
                autoFix: false,
            });
        }
        return null;
    }
}
