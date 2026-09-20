import { BaseComponent } from '../BaseComponent';
import { createValidationIssue } from '../component-schema.js';

export class Esp32CamLogic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
    }
    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        // Core operations run remotely in QEMU.
        // We only provide logical wire anchoring.
    }

    // 12.4 v2: numeric UI state for SAB slot {i0: streaming} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {},
            i: {streaming: (s.streaming ? 1 : 0)},
        };
    }
    validate(component: any, graph: Map<string, string[]>, validator?: any) {
        const v5Volts = validator?.calculateVoltageAtNode(`${component.id}.5V.1`) || 0;
        const v3Volts = validator?.calculateVoltageAtNode(`${component.id}.3V3`) || 0;

        if (v5Volts > 5.5) {
          return createValidationIssue({
            ruleId: 'esp32cam-power-input-check',
            severity: 'error',
            message: `🔥 [ESP32-CAM ${component.id}] ${v5Volts}V applied to 5V.1. Max expected is 5V.`,
            compIds: [component.id],
            remediation: 'Keep the 5V input within the 5.0V tolerance level.',
            autoFix: false,
          });
        }

        if (v3Volts > 3.6) {
          return createValidationIssue({
            ruleId: 'esp32cam-power-input-check',
            severity: 'error',
            message: `🔥 [ESP32-CAM ${component.id}] ${v3Volts}V applied to 3V3. Max expected is 3.3V.`,
            compIds: [component.id],
            remediation: 'Keep the 3V3 rail within the 3.3V logic range.',
            autoFix: false,
          });
        }

        return null;
    }
}
