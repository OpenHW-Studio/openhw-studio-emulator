// Component v2: validation logic lives in logic.ts::validate() (single source).
// This module is a backward-compat shim — registry/validator code that imports
// './validation' keeps working unchanged. New code should call logic.validate().
import { createValidationIssue } from '../component-schema.js';
import type { ComponentValidationRule } from '../component-schema.js';
import { ResistorLogic } from './logic';

const delegate = ResistorLogic.prototype.validate
    ? (component: any, graph: Map<string, string[]>) =>
        ResistorLogic.prototype.validate!.call(undefined, component, graph)
    : (_component: any, _graph: Map<string, string[]>) => null;

export const validation: { rules: ComponentValidationRule[] } = {
    rules: [
        {
            id: 'resistor-power-dissipation',
            name: 'Resistor Power Dissipation',
            severity: 'error' as const,
            priority: 10,
            description: 'Detect when the resistor exceeds its power rating.',
            check: (component: any, graph: Map<string, string[]>) => {
                const raw = delegate(component, graph);
                if (!raw) return null;
                const list = Array.isArray(raw) ? raw : [raw];
                const mine = list.filter((r: any) => String(r.ruleId || r.id || '') === 'resistor-power-dissipation');
                if (mine.length === 0) return null;
                return mine.map((r: any) => createValidationIssue({
                    ruleId: String(r.ruleId || r.id || 'resistor-power-dissipation'),
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
