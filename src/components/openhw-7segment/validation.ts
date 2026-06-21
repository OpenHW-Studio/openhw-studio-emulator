import { createValidationIssue } from '../component-schema.js';
import type { ComponentValidationRule } from '../component-schema.js';

export const validation: { rules: ComponentValidationRule[] } = {
    rules: [
        {
            id: '7segment-common-and-segment-check',
            name: '7-Segment Common Pin Check',
            severity: 'warn',
            priority: 10,
            description: 'Warn when the common pin or segment resistors are missing.',
            check: (component: any, graph: Map<string, string[]>, validator: any) => {
                const numDigits = parseInt(component.attrs?.digits || '4', 10);
                const issues = [];
                
                let anyDigConnected = false;
                for (let i = 1; i <= numDigits; i++) {
                    if (validator.getNeighbors(`${component.id}.DIG${i}`).length > 0) {
                        anyDigConnected = true;
                        break;
                    }
                }

                if (!anyDigConnected) {
                    issues.push(createValidationIssue({
                        ruleId: '7segment-common-and-segment-check',
                        severity: 'warn',
                        message: `⚠️ [7-Segment ${component.id}] Digit common pins (DIG1${numDigits > 1 ? '-DIG' + numDigits : ''}) are not connected. The display will not light up.`,
                        compIds: [component.id],
                        remediation: 'Connect the digit common pins to control them.',
                        autoFix: true,
                    }));
                }



                return issues.length > 0 ? issues : null;
            }
        }
    ]
};
