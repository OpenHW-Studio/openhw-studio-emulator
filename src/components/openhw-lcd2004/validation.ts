import { createValidationIssue } from '../component-schema.js';
import type { ComponentValidationRule } from '../component-schema.js';

export const validation: { rules: ComponentValidationRule[] } = {
    rules: [
        {
            id: 'lcd2004-interface-check',
            name: 'LCD Parallel Interface Check',
            severity: 'warn',
            priority: 10,
            description: 'Warn when the LCD power, ground, or control pins are disconnected.',
            check: (component: any, graph: Map<string, string[]>, validator: any) => {
                const pins = validator.getComponentPins(component);
                const vdd = pins.find((p: string) => p.includes('VDD'));
                const vss = pins.find((p: string) => p.includes('VSS'));
                const rs = pins.find((p: string) => p.includes('RS'));
                const e = pins.find((p: string) => p.includes('E'));
                const issues = [];

                if (vdd) {
                    const node = `${component.id}.${vdd}`;
                    if (validator.getNeighbors(node).length === 0) {
                        issues.push(createValidationIssue({
                            ruleId: 'lcd2004-interface-check',
                            severity: 'warn',
                            message: `⚠️ [${component.type} ${component.id}] Power (VDD) is not connected.`,
                            compIds: [component.id],
                            remediation: 'Connect VDD to the correct 5V supply rail.',
                            autoFix: true,
                        }));
                    } else if (!validator.hasResistivePathToSupply(node)) {
                        issues.push(createValidationIssue({
                            ruleId: 'lcd2004-interface-check',
                            severity: 'warn',
                            message: `⚠️ [${component.type} ${component.id}] Power (VDD) is connected but does not reach a valid power supply rail.`,
                            compIds: [component.id],
                            remediation: 'Ensure VDD path connects to a 5V power source.',
                        }));
                    }
                }

                if (vss) {
                    const node = `${component.id}.${vss}`;
                    if (validator.getNeighbors(node).length === 0) {
                        issues.push(createValidationIssue({
                            ruleId: 'lcd2004-interface-check',
                            severity: 'warn',
                            message: `⚠️ [${component.type} ${component.id}] Ground (VSS) is not connected.`,
                            compIds: [component.id],
                            remediation: 'Connect VSS to the common ground rail.',
                            autoFix: true,
                        }));
                    } else {
                        const gndSources = validator.collectVoltageSources(node);
                        if (!gndSources.some((s: any) => s.voltage === 0)) {
                            issues.push(createValidationIssue({
                                ruleId: 'lcd2004-interface-check',
                                severity: 'warn',
                                message: `⚠️ [${component.type} ${component.id}] Ground (VSS) is connected but does not reach a valid ground rail (GND).`,
                                compIds: [component.id],
                                remediation: 'Ensure VSS path connects to a valid ground rail.',
                            }));
                        }
                    }
                }

                if (rs && validator.getNeighbors(`${component.id}.${rs}`).length === 0) {
                    issues.push(createValidationIssue({
                        ruleId: 'lcd2004-interface-check',
                        severity: 'warn',
                        message: `⚠️ [${component.type} ${component.id}] RS (Register Select) pin is floating.`,
                        compIds: [component.id],
                        remediation: 'Connect RS to the MCU digital control pin.',
                        autoFix: true,
                    }));
                }

                if (e && validator.getNeighbors(`${component.id}.${e}`).length === 0) {
                    issues.push(createValidationIssue({
                        ruleId: 'lcd2004-interface-check',
                        severity: 'warn',
                        message: `⚠️ [${component.type} ${component.id}] E (Enable) pin is floating.`,
                        compIds: [component.id],
                        remediation: 'Connect E to the MCU digital control pin.',
                        autoFix: true,
                    }));
                }

                // Check if at least D4-D7 are connected (4-bit mode is most common)
                const dataConnected = [4, 5, 6, 7].some(i => {
                    const dPin = pins.find((p: string) => p.includes(`D${i}`));
                    return dPin && validator.getNeighbors(`${component.id}.${dPin}`).length > 0;
                });

                if (!dataConnected) {
                    issues.push(createValidationIssue({
                        ruleId: 'lcd2004-interface-check',
                        severity: 'warn',
                        message: `⚠️ [${component.type} ${component.id}] No data pins connected. In 4-bit mode, connect D4-D7.`,
                        compIds: [component.id],
                        remediation: 'Connect at least D4, D5, D6, and D7 to the MCU.',
                    }));
                }

                return issues.length > 0 ? issues : null;
            }
        }
    ]
};
