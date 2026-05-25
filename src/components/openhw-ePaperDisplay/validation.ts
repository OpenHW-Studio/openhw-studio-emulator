import { createValidationIssue } from '../component-schema.js';
import type { ComponentValidationRule } from '../component-schema.js';

export const validation: { rules: ComponentValidationRule[] } = {
    rules: [
        {
            id: 'epaper-interface-check',
            name: 'e-Paper SPI Interface Check',
            severity: 'warn',
            priority: 10,
            description: 'Warn when the e-Paper power, ground, or SPI pins are disconnected.',
            check: (component: any, graph: Map<string, string[]>, validator: any) => {
                const pins = validator.getComponentPins(component);
                const vcc = pins.find((p: string) => p.includes('VCC'));
                const gnd = pins.find((p: string) => p.includes('GND'));
                const din = pins.find((p: string) => p.includes('DIN'));
                const clk = pins.find((p: string) => p.includes('CLK'));
                const cs = pins.find((p: string) => p.includes('CS'));
                const dc = pins.find((p: string) => p.includes('DC'));
                const issues = [];

                if (vcc) {
                    const node = `${component.id}.${vcc}`;
                    if (validator.getNeighbors(node).length === 0) {
                        issues.push(createValidationIssue({
                            ruleId: 'epaper-interface-check',
                            severity: 'warn',
                            message: `⚠️ [${component.type} ${component.id}] Power (VCC) is not connected.`,
                            compIds: [component.id],
                            remediation: 'Connect VCC to a 3.3V power source.',
                            autoFix: true,
                        }));
                    }
                }

                if (gnd) {
                    const node = `${component.id}.${gnd}`;
                    if (validator.getNeighbors(node).length === 0) {
                        issues.push(createValidationIssue({
                            ruleId: 'epaper-interface-check',
                            severity: 'warn',
                            message: `⚠️ [${component.type} ${component.id}] Ground (GND) is not connected.`,
                            compIds: [component.id],
                            remediation: 'Connect GND to the common ground rail.',
                            autoFix: true,
                        }));
                    }
                }

                if (din && validator.getNeighbors(`${component.id}.${din}`).length === 0) {
                    issues.push(createValidationIssue({
                        ruleId: 'epaper-interface-check',
                        severity: 'warn',
                        message: `⚠️ [${component.type} ${component.id}] DIN (MOSI) pin is floating.`,
                        compIds: [component.id],
                        remediation: 'Connect DIN to the MCU SPI MOSI pin.',
                        autoFix: true,
                    }));
                }

                if (clk && validator.getNeighbors(`${component.id}.${clk}`).length === 0) {
                    issues.push(createValidationIssue({
                        ruleId: 'epaper-interface-check',
                        severity: 'warn',
                        message: `⚠️ [${component.type} ${component.id}] CLK (SCK) pin is floating.`,
                        compIds: [component.id],
                        remediation: 'Connect CLK to the MCU SPI Clock pin.',
                        autoFix: true,
                    }));
                }

                if (cs && validator.getNeighbors(`${component.id}.${cs}`).length === 0) {
                    issues.push(createValidationIssue({
                        ruleId: 'epaper-interface-check',
                        severity: 'warn',
                        message: `⚠️ [${component.type} ${component.id}] CS (Chip Select) pin is floating.`,
                        compIds: [component.id],
                        remediation: 'Connect CS to an MCU digital pin.',
                        autoFix: true,
                    }));
                }

                if (dc && validator.getNeighbors(`${component.id}.${dc}`).length === 0) {
                    issues.push(createValidationIssue({
                        ruleId: 'epaper-interface-check',
                        severity: 'warn',
                        message: `⚠️ [${component.type} ${component.id}] DC (Data/Command) pin is floating.`,
                        compIds: [component.id],
                        remediation: 'Connect DC to an MCU digital pin.',
                        autoFix: true,
                    }));
                }

                return issues.length > 0 ? issues : null;
            }
        }
    ]
};
