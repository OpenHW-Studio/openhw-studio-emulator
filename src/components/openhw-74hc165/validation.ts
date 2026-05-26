import { createValidationIssue } from '../component-schema.js';
import type { ComponentValidationRule } from '../component-schema.js';

export const validation: { rules: ComponentValidationRule[] } = {
    rules: [
        {
            id: 'hc165-floating-ce',
            name: 'Floating Clock Enable (CE) Pin',
            severity: 'warn',
            priority: 10,
            description: 'Warn when CE is floating and clock might be disabled unpredictably.',
            check: (component: any, graph: Map<string, string[]>) => {
                const ceConnected = graph.get(`${component.id}.ce`);
                if (!ceConnected || ceConnected.length === 0) {
                    return createValidationIssue({
                        ruleId: 'hc165-floating-ce',
                        severity: 'warn',
                        message: `⚠️ [Shift Register ${component.id}] Warning: Clock Enable (CE) pin is floating. It should be tied to GND to enable shifting, or driven by the MCU.`,
                        compIds: [component.id],
                        remediation: 'Tie CE to GND or drive it from a control pin.',
                        autoFix: true,
                    });
                }
                return null;
            }
        },
        {
            id: 'hc165-floating-pl',
            name: 'Floating Parallel Load (PL) Pin',
            severity: 'warn',
            priority: 20,
            description: 'Warn when PL is floating and may load data randomly.',
            check: (component: any, graph: Map<string, string[]>) => {
                const plConnected = graph.get(`${component.id}.pl`);
                if (!plConnected || plConnected.length === 0) {
                    return createValidationIssue({
                        ruleId: 'hc165-floating-pl',
                        severity: 'warn',
                        message: `⚠️ [Shift Register ${component.id}] Warning: Parallel Load (PL) pin is floating. It should be driven by the MCU to control when data is latched.`,
                        compIds: [component.id],
                        remediation: 'Drive PL from a control pin (pulse LOW to load).',
                        autoFix: false,
                    });
                }
                return null;
            }
        }
    ]
};
