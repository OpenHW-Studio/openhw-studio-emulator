// Component v2: validation logic lives in logic.ts::validate() (single source).
// This module is a backward-compat shim — registry/validator code that imports
// './validation' keeps working unchanged. New code should call logic.validate().
import { createValidationIssue } from '../component-schema.js';
import type { ComponentValidationRule } from '../component-schema.js';
import { RelayModuleLogic } from './logic';

const delegate = RelayModuleLogic.prototype.validate
    ? (component: any, graph: Map<string, string[]>) =>
        RelayModuleLogic.prototype.validate!.call(undefined, component, graph)
    : (_component: any, _graph: Map<string, string[]>) => null;

export const validation: { rules: ComponentValidationRule[] } = {
    rules: [
        {
            id: 'relay-module-power-check',
            name: 'Relay Module Power Check',
            severity: 'warn' as const,
            priority: 10,
            description: 'Warn when relay power pins are disconnected.',
            check: (component: any, graph: Map<string, string[]>) => {
                const raw = delegate(component, graph);
                if (!raw) return null;
                const list = Array.isArray(raw) ? raw : [raw];
                const mine = list.filter((r: any) => String(r.ruleId || r.id || '') === 'relay-module-power-check');
                if (mine.length === 0) return null;
                return mine.map((r: any) => createValidationIssue({
                    ruleId: String(r.ruleId || r.id || 'relay-module-power-check'),
                    severity: r.severity || 'warn',
                    message: String(r.message || ''),
                    compIds: r.compIds || [component.id],
                    remediation: r.remediation,
                    autoFix: r.autoFix,
                }));
            }
        },
        {
            id: 'relay-module-control-pin-check',
            name: 'Relay Module Control Pin Check',
            severity: 'warn' as const,
            priority: 10,
            description: 'Warn when the relay control pin is disconnected.',
            check: (component: any, graph: Map<string, string[]>) => {
                const raw = delegate(component, graph);
                if (!raw) return null;
                const list = Array.isArray(raw) ? raw : [raw];
                const mine = list.filter((r: any) => String(r.ruleId || r.id || '') === 'relay-module-control-pin-check');
                if (mine.length === 0) return null;
                return mine.map((r: any) => createValidationIssue({
                    ruleId: String(r.ruleId || r.id || 'relay-module-control-pin-check'),
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
