import { createValidationIssue } from '../component-schema.js';
import type { ComponentValidationRule } from '../component-schema.js';

export const validation: { rules: ComponentValidationRule[] } = {
    rules: [
        {
            id: 'mfrc522-voltage-check',
            name: 'MFRC522 Voltage Check',
            severity: 'warn',
            priority: 10,
            description: 'Ensure MFRC522 is powered by 3.3V and not 5V.',
            check: (component: any, graph: Map<string, string[]>) => {
                const vcc = graph.get(`${component.id}.3V3`) || graph.get(`${component.id}.VCC`) || [];
                const issues = [];

                if (vcc.length === 0) {
                    issues.push(createValidationIssue({
                        ruleId: 'mfrc522-voltage-check',
                        severity: 'warn',
                        message: `⚠️ [MFRC522 ${component.id}] Power not connected. IMPORTANT: Use 3.3V only — 5V will damage the chip!`,
                        compIds: [component.id],
                        remediation: 'Connect the 3V3 pin to the MCU 3.3V power rail.',
                        autoFix: true,
                    }));
                } else {
                    const connectedTo5V = vcc.some((c: string) => c.includes('5V') || c.includes('VIN'));
                    if (connectedTo5V) {
                        issues.push(createValidationIssue({
                            ruleId: 'mfrc522-voltage-check',
                            severity: 'error',
                            message: `🔴 [MFRC522 ${component.id}] Power appears connected to 5V. This WILL damage the MFRC522. Use 3.3V only!`,
                            compIds: [component.id],
                            remediation: 'Move power connection from 5V to 3.3V.',
                            autoFix: false,
                        }));
                    }
                }
                return issues.length > 0 ? issues : null;
            },
        },
        {
            id: 'mfrc522-spi-check',
            name: 'MFRC522 SPI Check',
            severity: 'warn',
            priority: 20,
            description: 'Ensure all required SPI pins are connected.',
            check: (component: any, graph: Map<string, string[]>) => {
                const pins = ['MISO', 'MOSI', 'SCK', 'SDA'];
                const missingPins = pins.filter(pin => {
                    const conn = graph.get(`${component.id}.${pin}`);
                    return !conn || conn.length === 0;
                });

                if (missingPins.length > 0) {
                    return createValidationIssue({
                        ruleId: 'mfrc522-spi-check',
                        severity: 'warn',
                        message: `⚠️ [MFRC522 ${component.id}] Missing SPI connections: ${missingPins.join(', ')}. All SPI pins (MISO, MOSI, SCK, SDA/CS) must be connected.`,
                        compIds: [component.id],
                        remediation: 'Connect all required SPI pins to the MCU.',
                        autoFix: true,
                    });
                }
                return null;
            },
        },
    ],
};
