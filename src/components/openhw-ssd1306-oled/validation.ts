import { createValidationIssue } from '../component-schema.js';
import type { ComponentValidationRule } from '../component-schema.js';

export const validation: { rules: ComponentValidationRule[] } = {
    rules: [
        {
            id: 'ssd1306-i2c-interface-check',
            name: 'I2C Interface Check',
            severity: 'warn',
            priority: 10,
            description: 'Warn when the OLED power, ground, or I2C pins are disconnected.',
            check: (component: any, graph: Map<string, string[]>, validator: any) => {
                const pins = validator.getComponentPins(component);
                const sda = pins.find((p: string) => p.includes('SDA'));
                const scl = pins.find((p: string) => p.includes('SCL'));
                const vcc = pins.find((p: string) => p.includes('VCC') || p.includes('V+'));
                const gnd = pins.find((p: string) => p.includes('GND'));
                const issues = [];

                if (vcc) {
                    const node = `${component.id}.${vcc}`;
                    if (validator.getNeighbors(node).length === 0) {
                        issues.push(createValidationIssue({
                            ruleId: 'ssd1306-i2c-interface-check',
                            severity: 'warn',
                            message: `⚠️ [${component.type} ${component.id}] Power (VCC) is not connected.`,
                            compIds: [component.id],
                            remediation: 'Connect VCC to the correct supply rail.',
                            autoFix: true,
                        }));
                    } else if (!validator.hasResistivePathToSupply(node)) {
                        issues.push(createValidationIssue({
                            ruleId: 'ssd1306-i2c-interface-check',
                            severity: 'warn',
                            message: `⚠️ [${component.type} ${component.id}] Power (VCC) is connected but does not reach a valid power supply rail.`,
                            compIds: [component.id],
                            remediation: 'Ensure VCC path connects to a 3.3V/5V power source.',
                        }));
                    }
                }

                if (gnd) {
                    const node = `${component.id}.${gnd}`;
                    if (validator.getNeighbors(node).length === 0) {
                        issues.push(createValidationIssue({
                            ruleId: 'ssd1306-i2c-interface-check',
                            severity: 'warn',
                            message: `⚠️ [${component.type} ${component.id}] Ground (GND) is not connected.`,
                            compIds: [component.id],
                            remediation: 'Connect GND to the common ground rail.',
                            autoFix: true,
                        }));
                    } else {
                        const gndSources = validator.collectVoltageSources(node);
                        if (!gndSources.some((s: any) => s.voltage === 0)) {
                            issues.push(createValidationIssue({
                                ruleId: 'ssd1306-i2c-interface-check',
                                severity: 'warn',
                                message: `⚠️ [${component.type} ${component.id}] Ground (GND) is connected but does not reach a valid ground rail (GND).`,
                                compIds: [component.id],
                                remediation: 'Ensure GND path connects to a valid ground rail.',
                            }));
                        }
                    }
                }
                if (sda && validator.getNeighbors(`${component.id}.${sda}`).length === 0) {
                    issues.push(createValidationIssue({
                        ruleId: 'ssd1306-i2c-interface-check',
                        severity: 'warn',
                        message: `⚠️ [${component.type} ${component.id}] I2C SDA pin is floating.`,
                        compIds: [component.id],
                        remediation: 'Connect SDA to the MCU I2C data pin.',
                        autoFix: true,
                    }));
                }
                if (scl && validator.getNeighbors(`${component.id}.${scl}`).length === 0) {
                    issues.push(createValidationIssue({
                        ruleId: 'ssd1306-i2c-interface-check',
                        severity: 'warn',
                        message: `⚠️ [${component.type} ${component.id}] I2C SCL pin is floating.`,
                        compIds: [component.id],
                        remediation: 'Connect SCL to the MCU I2C clock pin.',
                        autoFix: true,
                    }));
                }

                return issues.length > 0 ? issues : null;
            }
        }
    ]
};
