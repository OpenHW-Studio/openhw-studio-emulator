// Component v2: validation logic lives in logic.ts::validate() (single source).
// This module is a backward-compat shim — registry/validator code that imports
// './validation' keeps working unchanged. New code should call logic.validate().
import { createValidationIssue } from '../component-schema.js';
import type { ComponentValidationRule } from '../component-schema.js';
import { LEDLogic } from './logic';

const delegate = LEDLogic.prototype.validate
    ? (component: any, graph: Map<string, string[]>) =>
        LEDLogic.prototype.validate!.call(undefined, component, graph)
    : (_component: any, _graph: Map<string, string[]>) => null;

export const validation: { rules: ComponentValidationRule[] } = {
    rules: [
        {
            id: 'led-series-resistor-check',
            name: 'LED Series Resistor Check',
            severity: 'warn',
            priority: 10,
            description: 'Warn when an LED is left completely disconnected.',
            check: (component: any, graph: Map<string, string[]>) => {
                const raw = delegate(component, graph);
                if (!raw) return null;
                return createValidationIssue({
                    ruleId: String(raw.ruleId || 'led-series-resistor-check'),
                    severity: raw.severity || 'warn',
                    message: String(raw.message || ''),
                    compIds: raw.compIds || [component.id],
                    remediation: raw.remediation,
                });
            }
        }
    ]
};
