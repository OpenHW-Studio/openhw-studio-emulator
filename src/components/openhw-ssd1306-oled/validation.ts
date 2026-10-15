// Component v2: validation logic lives in logic.ts::validate() (single source).
// This module is a backward-compat shim — registry/validator code that imports
// './validation' keeps working unchanged. New code should call logic.validate().
import { createValidationIssue } from '../component-schema.js';
import type { ComponentValidationRule } from '../component-schema.js';
import { SSD1306Logic } from './logic';

const delegate = SSD1306Logic.prototype.validate
    ? (component: any, graph: Map<string, string[]>, validator?: any) =>
        SSD1306Logic.prototype.validate!.call(undefined, component, graph, validator)
    : (_component: any, _graph: Map<string, string[]>) => null;

export const validation: { rules: ComponentValidationRule[] } = {
    rules: [
        {
            id: 'ssd1306-i2c-interface-check',
            name: 'I2C Interface Check',
            severity: 'warn' as const,
            priority: 10,
            description: 'Warn when the OLED power, ground, or I2C pins are disconnected.',
            check: (component: any, graph: Map<string, string[]>, validator?: any) => {
                const raw = delegate(component, graph, validator);
                if (!raw) return null;
                const list = Array.isArray(raw) ? raw : [raw];
                const mine = list.filter((r: any) => String(r.ruleId || r.id || '') === 'ssd1306-i2c-interface-check');
                if (mine.length === 0) return null;
                return mine.map((r: any) => createValidationIssue({
                    ruleId: String(r.ruleId || r.id || 'ssd1306-i2c-interface-check'),
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
