import { createValidationIssue } from '../component-schema.js';
import type { ComponentValidationRule } from '../component-schema.js';

export const validation: { rules: ComponentValidationRule[] } = {
    rules: [

        {
            id: 'arduino-nano-i2c-pullups',
            name: 'I2C Pullups Check',
            severity: 'warn',
            priority: 20,
            description: 'Warn when the Nano I2C pins do not have a pull-up path to VCC.',
            check: (component: any, graph: Map<string, string[]>, validator: any) => {
                const i2cPins = ["A4", "A5"];
                const issues = [];

                i2cPins.forEach(pinName => {
                    const pinNode = `${component.id}.${pinName}`;
                    if (validator.getNeighbors(pinNode).length > 0) {
                        const hasPullup = validator.findSeriesResistance(pinNode) > 0;
                        if (!hasPullup) {
                            issues.push(createValidationIssue({
                                ruleId: 'arduino-nano-i2c-pullups',
                                severity: 'warn',
                                message: `⚠️ [Nano ${component.id}] I2C PULLUP WARNING: ${pinNode} is in use but missing a Pull-Up resistor to VCC.`,
                                compIds: [component.id],
                                remediation: 'Add a pull-up resistor to VCC.',
                            }));
                        }
                    }
                });

                return issues.length > 0 ? issues : null;
            }
        }
    ]
};
