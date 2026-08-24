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
                const numDigits = parseInt(component.attrs?.digits || '1', 10);
                const issues = [];
                
                // The manifest defines common pins as COM.1, COM.2, ... (not DIG1, DIG2)
                let anyComConnected = false;
                for (let i = 1; i <= numDigits; i++) {
                    if (validator.getNeighbors(`${component.id}.COM.${i}`).length > 0) {
                        anyComConnected = true;
                        break;
                    }
                }

                if (!anyComConnected) {
                    issues.push(createValidationIssue({
                        ruleId: '7segment-common-and-segment-check',
                        severity: 'warn',
                        message: `⚠️ [7-Segment ${component.id}] Common pin(s) (COM.1${numDigits > 1 ? '-COM.' + numDigits : ''}) are not connected. The display will not light up.\nConnect COM.1 (and COM.2) to Arduino GND for common-cathode mode.`,
                        compIds: [component.id],
                        remediation: 'Connect COM.1 and COM.2 to Arduino GND (common cathode) or 5V (common anode).',
                        autoFix: true,
                    }));
                }



                return issues.length > 0 ? issues : null;
            }
        }
    ]
};
