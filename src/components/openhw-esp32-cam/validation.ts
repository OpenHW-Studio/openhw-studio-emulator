// Component v2: validation logic lives in logic.ts::validate() (single source).
// This module is a backward-compat shim — registry/validator code that imports
// './validation' keeps working unchanged. New code should call logic.validate().
import { createValidationIssue } from '../component-schema.js';
import type { ComponentValidationRule } from '../component-schema.js';
import { Esp32CamLogic } from './logic';

const delegate = Esp32CamLogic.prototype.validate
    ? (component: any, graph: Map<string, string[]>, validator?: any) =>
        Esp32CamLogic.prototype.validate!.call(undefined, component, graph, validator)
    : (_component: any, _graph: Map<string, string[]>) => null;

export const validation: { rules: ComponentValidationRule[] } = {
    rules: [
        {
            id: 'esp32cam-power-input-check',
            name: 'ESP32-CAM Power Input Check',
            severity: 'error' as const,
            priority: 10,
            description: 'Detect over-voltage on 5V and 3V3 input rails.',
            check: (component: any, graph: Map<string, string[]>, validator?: any) => {
                const raw = delegate(component, graph, validator);
                if (!raw) return null;
                const list = Array.isArray(raw) ? raw : [raw];
                const mine = list.filter((r: any) => String(r.ruleId || r.id || '') === 'esp32cam-power-input-check');
                if (mine.length === 0) return null;
                return mine.map((r: any) => createValidationIssue({
                    ruleId: String(r.ruleId || r.id || 'esp32cam-power-input-check'),
                    severity: r.severity || 'error',
                    message: String(r.message || ''),
                    compIds: r.compIds || [component.id],
                    remediation: r.remediation,
                    autoFix: r.autoFix,
                }));
            }
        }
    ]
};
