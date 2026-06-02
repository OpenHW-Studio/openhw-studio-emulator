import { createValidationIssue } from '../component-schema.js';
import type { ComponentValidationRule } from '../component-schema.js';

export const validation: { rules: ComponentValidationRule[] } = {
    rules: [
        {
            id: 'stm32-blue-pill-power-check',
            name: 'STM32 Blue Pill Power Check',
            severity: 'warn',
            priority: 10,
            description: 'Warn when the Blue Pill board is not connected to power or ground.',
            check: (component: any, graph: Map<string, string[]>) => {
                const gnd = graph.get(`${component.id}.GND`);
                const vcc = graph.get(`${component.id}.3V3`);
                const hasGnd = gnd && gnd.length > 0;
                const hasVcc = vcc && vcc.length > 0;
                if (!hasGnd || !hasVcc) {
                    return createValidationIssue({
                        ruleId: 'stm32-blue-pill-power-check',
                        severity: 'warn',
                        message: `⚠️ [STM32 Blue Pill ${component.id}] Power rails are not fully connected.`,
                        compIds: [component.id],
                        remediation: 'Connect both 3V3 and GND to the Blue Pill board.',
                        autoFix: false,
                    });
                }
                return null;
            }
        }
    ]
};
