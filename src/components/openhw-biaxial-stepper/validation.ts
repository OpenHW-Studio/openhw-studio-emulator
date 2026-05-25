import { createValidationIssue } from '../component-schema.js';
import type { ComponentValidationRule } from '../component-schema.js';

export const validation: { rules: ComponentValidationRule[] } = {
    rules: [
        {
            id: 'biaxial-stepper-check',
            name: 'Biaxial Stepper Motor Check',
            severity: 'warn',
            priority: 10,
            description: 'Warn when stepper motor coils are disconnected.',
            check: (component: any, graph: Map<string, string[]>, validator: any) => {
                const pins = validator.getComponentPins(component);
                const issues = [];
                const requiredPins = ['A1+', 'A1-', 'B1+', 'B1-', 'A2+', 'A2-', 'B2+', 'B2-'];
                
                for (const pin of requiredPins) {
                    const p = pins.find((p: string) => p === pin);
                    if (p && validator.getNeighbors(`${component.id}.${p}`).length === 0) {
                        issues.push(createValidationIssue({
                            ruleId: 'biaxial-stepper-check',
                            severity: 'warn',
                            message: `⚠️ [${component.type} ${component.id}] Coil pin ${pin} is floating.`,
                            compIds: [component.id],
                            remediation: `Connect ${pin} to a stepper driver output.`,
                            autoFix: true,
                        }));
                    }
                }

                return issues.length > 0 ? issues : null;
            }
        }
    ]
};
