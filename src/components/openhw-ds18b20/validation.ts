// Component v2: validation logic lives in logic.ts::validate() (single source).
// This module is a backward-compat shim — registry/validator code that imports
// './validation' keeps working unchanged. New code should call logic.validate().
import { createValidationIssue } from '../component-schema.js';
import type { ComponentValidationRule } from '../component-schema.js';
import { DS18B20Logic } from './logic';

const delegate = DS18B20Logic.prototype.validate
    ? (component: any, graph: Map<string, string[]>, validator?: any) =>
        DS18B20Logic.prototype.validate!.call(undefined, component, graph, validator)
    : (_component: any, _graph: Map<string, string[]>) => null;

export const validation: { rules: ComponentValidationRule[] } = {
    rules: [
        {
            id: 'ds18b20-power-check',
            name: 'DS18B20 Power Check',
            severity: 'warn' as const,
            priority: 10,
            description: 'Warn when VCC or GND pins are disconnected.',
            check: (component: any, graph: Map<string, string[]>, validator?: any) => {
                const raw = delegate(component, graph, validator);
                if (!raw) return null;
                const list = Array.isArray(raw) ? raw : [raw];
                const mine = list.filter((r: any) => String(r.ruleId || r.id || '') === 'ds18b20-power-check');
                if (mine.length === 0) return null;
                return mine.map((r: any) => createValidationIssue({
                    ruleId: String(r.ruleId || r.id || 'ds18b20-power-check'),
                    severity: r.severity || 'warn',
                    message: String(r.message || ''),
                    compIds: r.compIds || [component.id],
                    remediation: r.remediation,
                    autoFix: r.autoFix,
                }));
            }
        },
        {
            id: 'ds18b20-data-check',
            name: 'DS18B20 Data Pin Check',
            severity: 'warn' as const,
            priority: 20,
            description: 'Warn when DQ pin is disconnected.',
            check: (component: any, graph: Map<string, string[]>, validator?: any) => {
                const raw = delegate(component, graph, validator);
                if (!raw) return null;
                const list = Array.isArray(raw) ? raw : [raw];
                const mine = list.filter((r: any) => String(r.ruleId || r.id || '') === 'ds18b20-data-check');
                if (mine.length === 0) return null;
                return mine.map((r: any) => createValidationIssue({
                    ruleId: String(r.ruleId || r.id || 'ds18b20-data-check'),
                    severity: r.severity || 'warn',
                    message: String(r.message || ''),
                    compIds: r.compIds || [component.id],
                    remediation: r.remediation,
                    autoFix: r.autoFix,
                }));
            }
        },
        {
            id: 'ds18b20-pullup-check',
            name: 'DS18B20 Pull-up Resistor Check',
            severity: 'warn' as const,
            priority: 30,
            description: 'Check for pull-up resistor on DQ line.',
            check: (component: any, graph: Map<string, string[]>, validator?: any) => {
                const raw = delegate(component, graph, validator);
                if (!raw) return null;
                const list = Array.isArray(raw) ? raw : [raw];
                const mine = list.filter((r: any) => String(r.ruleId || r.id || '') === 'ds18b20-pullup-check');
                if (mine.length === 0) return null;
                return mine.map((r: any) => createValidationIssue({
                    ruleId: String(r.ruleId || r.id || 'ds18b20-pullup-check'),
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
