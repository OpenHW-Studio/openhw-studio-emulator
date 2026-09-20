// Component v2: validation logic lives in logic.ts::validate() (single source).
// This module is a backward-compat shim — registry/validator code that imports
// './validation' keeps working unchanged. New code should call logic.validate().
import { createValidationIssue } from '../component-schema.js';
import type { ComponentValidationRule } from '../component-schema.js';
import { MAX7219Logic } from './logic';

const delegate = MAX7219Logic.prototype.validate
    ? (component: any, graph: Map<string, string[]>, validator?: any) =>
        MAX7219Logic.prototype.validate!.call(undefined, component, graph, validator)
    : (_component: any, _graph: Map<string, string[]>) => null;

export const validation: { rules: ComponentValidationRule[] } = {
    rules: [
        {
            id: 'max7219-power-check',
            name: 'max7219-power-check',
            severity: 'warn' as const,
            priority: 10,
            description: 'MAX7219 needs VCC and GND properly connected',
            check: (component: any, graph: Map<string, string[]>, validator?: any) => {
                const raw = delegate(component, graph, validator);
                if (!raw) return null;
                const list = Array.isArray(raw) ? raw : [raw];
                const mine = list.filter((r: any) => String(r.ruleId || r.id || '') === 'max7219-power-check');
                if (mine.length === 0) return null;
                return mine.map((r: any) => createValidationIssue({
                    ruleId: String(r.ruleId || r.id || 'max7219-power-check'),
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
