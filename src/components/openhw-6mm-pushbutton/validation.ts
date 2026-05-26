import { createValidationIssue } from '../component-schema.js';
import type { ComponentValidationRule } from '../component-schema.js';

export const validation: { rules: ComponentValidationRule[] } = {
    rules: [
        {
            id: 'pushbutton6mm-floating-input-check',
            name: '6mm Pushbutton Floating Input Check',
            severity: 'warn',
            priority: 10,
            description: 'Warn when the pushbutton is completely disconnected or half-connected.',
            check: (component: any, graph: Map<string, string[]>) => {
                const p1a = graph.get(`${component.id}.1A`);
                const p1b = graph.get(`${component.id}.1B`);
                const p2a = graph.get(`${component.id}.2A`);
                const p2b = graph.get(`${component.id}.2B`);

                const side1Connected = (p1a && p1a.length > 0) || (p1b && p1b.length > 0);
                const side2Connected = (p2a && p2a.length > 0) || (p2b && p2b.length > 0);

                if (!side1Connected && !side2Connected) {
                    return createValidationIssue({
                        ruleId: 'pushbutton6mm-floating-input-check',
                        severity: 'warn',
                        message: `⚠️ [6mm Pushbutton ${component.id}] Warning: Button is completely disconnected.`,
                        compIds: [component.id],
                        remediation: 'Wire the pushbutton terminals into the circuit.',
                        autoFix: true,
                    });
                }

                if (side1Connected && !side2Connected) {
                    return createValidationIssue({
                        ruleId: 'pushbutton6mm-floating-input-check',
                        severity: 'warn',
                        message: `⚠️ [6mm Pushbutton ${component.id}] Warning: Only one side is connected. It will act as a floating pin.`,
                        compIds: [component.id],
                        remediation: 'Connect the other side (2A or 2B) to complete the circuit (e.g. to GND or a pull-down/up resistor).',
                        autoFix: false,
                    });
                }

                return null;
            }
        }
    ]
};
