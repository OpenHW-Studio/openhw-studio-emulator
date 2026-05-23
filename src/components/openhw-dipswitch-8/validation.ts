import { createValidationIssue } from '../component-schema.js';
import type { ComponentValidationRule } from '../component-schema.js';

export const validation: { rules: ComponentValidationRule[] } = {
    rules: [
        {
            id: 'dipswitch-8-floating-check',
            name: '8-Position DIP Switch Floating Connection Check',
            severity: 'warn',
            priority: 10,
            description: 'Warn when all switches in the DIP switch are floating.',
            check: (component: any, graph: Map<string, string[]>) => {
                let anyConnected = false;
                for (let i = 1; i <= 8; i++) {
                    const pA = graph.get(`${component.id}.${i}`);
                    const pB = graph.get(`${component.id}.${i}B`);
                    if ((pA && pA.length > 0) || (pB && pB.length > 0)) {
                        anyConnected = true;
                        break;
                    }
                }
                if (!anyConnected) {
                    return createValidationIssue({
                        ruleId: 'dipswitch-8-floating-check',
                        severity: 'warn',
                        message: `⚠️ [DIP Switch ${component.id}] Warning: Component is completely disconnected.`,
                        compIds: [component.id],
                        remediation: 'Connect wires to the top (1-8) and bottom (1B-8B) pins of the DIP switch.',
                        autoFix: false,
                    });
                }
                return null;
            }
        }
    ]
};
