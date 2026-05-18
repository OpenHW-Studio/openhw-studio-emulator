import { createValidationIssue } from '../component-schema.js';
import type { ComponentValidationRule } from '../component-schema.js';

export const validation: { rules: ComponentValidationRule[] } = {
    rules: [
        {
            id: 'pushbutton-floating-input-check',
            name: 'Pushbutton Floating Input Check',
            severity: 'warn',
            priority: 10,
            description: 'Warn when the pushbutton is not connected at all.',
            check: (component: any, graph: Map<string, string[]>, validator: any) => {
                const pins = validator.getComponentPins(component);
                
                const isConnected = pins.some((p: string) => {
                    const edges = graph.get(`${component.id}.${p}`);
                    return edges && edges.length > 0;
                });

                if (!isConnected) {
                    return createValidationIssue({
                        ruleId: 'pushbutton-floating-input-check',
                        severity: 'warn',
                        message: `⚠️ [Pushbutton ${component.id}] Warning: Button is completely disconnected.`,
                        compIds: [component.id],
                        remediation: 'Wire the pushbutton into the circuit.',
                        autoFix: true,
                    });
                }

                return null;
            }
        }
    ]
};
