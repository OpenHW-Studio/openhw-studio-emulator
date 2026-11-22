// Component v2: validation logic lives in logic.ts::validate() (single source).
// This module is a backward-compat shim — registry/validator code that imports
// './validation' keeps working unchanged. New code should call logic.validate().
import { createValidationIssue } from '../component-schema.js';
import type { ComponentValidationRule } from '../component-schema.js';
import { SoilMoistureSensorLogic } from './logic';

const delegate = SoilMoistureSensorLogic.prototype.validate
    ? (component: any, graph: Map<string, string[]>, validator?: any) =>
        SoilMoistureSensorLogic.prototype.validate!.call(undefined, component, graph, validator)
    : (_component: any, _graph: Map<string, string[]>) => null;

export const validation: { rules: ComponentValidationRule[] } = {
    rules: [
        {
            id: 'soil-moisture-sensor-connection-check',
            name: 'Sensor Connection Check',
            severity: 'warn' as const,
            priority: 10,
            description: 'Warn when sensor power, ground, or signal pins are disconnected.',
            check: (component: any, graph: Map<string, string[]>, validator?: any) => {
                const raw = delegate(component, graph, validator);
                if (!raw) return null;
                const list = Array.isArray(raw) ? raw : [raw];
                const mine = list.filter((r: any) => String(r.ruleId || r.id || '') === 'soil-moisture-sensor-connection-check');
                if (mine.length === 0) return null;
                return mine.map((r: any) => createValidationIssue({
                    ruleId: String(r.ruleId || r.id || 'soil-moisture-sensor-connection-check'),
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
