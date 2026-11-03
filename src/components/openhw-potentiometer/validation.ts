// Component v2: validation logic lives in logic.ts::validate() (single source).
// This module is a backward-compat shim — registry/validator code that imports
// './validation' keeps working unchanged. New code should call logic.validate().
import { createValidationIssue } from '../component-schema.js';
import type { ComponentValidationRule } from '../component-schema.js';
import { PotentiometerLogic } from './logic';

const delegate = PotentiometerLogic.prototype.validate
    ? (component: any, graph: Map<string, string[]>) =>
        PotentiometerLogic.prototype.validate!.call(undefined, component, graph)
    : (_component: any, _graph: Map<string, string[]>) => null;

export const validation: { rules: ComponentValidationRule[] } = {
    rules: [
        {
            id: 'potentiometer-power-dissipation',
            name: 'Potentiometer Power Dissipation',
            severity: 'error' as const,
            priority: 10,
            description: 'Detect when the potentiometer track would overheat.',
            check: (component: any, graph: Map<string, string[]>) => {
                const raw = delegate(component, graph);
                if (!raw) return null;
                const list = Array.isArray(raw) ? raw : [raw];
                const mine = list.filter((r: any) => String(r.ruleId || r.id || '') === 'potentiometer-power-dissipation');
                if (mine.length === 0) return null;
                return mine.map((r: any) => createValidationIssue({
                    ruleId: String(r.ruleId || r.id || 'potentiometer-power-dissipation'),
                    severity: r.severity || 'error',
                    message: String(r.message || ''),
                    compIds: r.compIds || [component.id],
                    remediation: r.remediation,
                    autoFix: r.autoFix,
                }));
            }
        },
        {
            id: 'potentiometer-floating-wiper',
            name: 'Floating Potentiometer Wiper',
            severity: 'warn' as const,
            priority: 5,
            description: 'Detect when the wiper pin is not connected.',
            check: (component: any, graph: Map<string, string[]>) => {
                const raw = delegate(component, graph);
                if (!raw) return null;
                const list = Array.isArray(raw) ? raw : [raw];
                const mine = list.filter((r: any) => String(r.ruleId || r.id || '') === 'potentiometer-floating-wiper');
                if (mine.length === 0) return null;
                return mine.map((r: any) => createValidationIssue({
                    ruleId: String(r.ruleId || r.id || 'potentiometer-floating-wiper'),
                    severity: r.severity || 'warn',
                    message: String(r.message || ''),
                    compIds: r.compIds || [component.id],
                    remediation: r.remediation,
                    autoFix: r.autoFix,
                }));
            }
        }
    ]
};
