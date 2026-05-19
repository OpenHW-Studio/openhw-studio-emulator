import { createValidationIssue } from '../component-schema.js';
import type { ComponentValidationRule } from '../component-schema.js';

export const validation: { rules: ComponentValidationRule[] } = {
    rules: [
        {
            id: 'ds18b20-power-check',
            name: 'DS18B20 Power Check',
            severity: 'warn',
            priority: 10,
            description: 'Warn when VCC or GND pins are disconnected.',
            check: (component: any, graph: Map<string, string[]>) => {
                const vdd = graph.get(`${component.id}.VCC`) || graph.get(`${component.id}.VDD`) || [];
                const gnd = graph.get(`${component.id}.GND`) || [];
                const issues = [];

                if (vdd.length === 0) {
                    issues.push(createValidationIssue({
                        ruleId: 'ds18b20-power-check',
                        severity: 'warn',
                        message: `⚠️ [DS18B20 ${component.id}] VCC pin not connected. Connect to 3.3V or 5V.`,
                        compIds: [component.id],
                        remediation: 'Connect VCC to the power rail.',
                        autoFix: true,
                    }));
                }
                if (gnd.length === 0) {
                    issues.push(createValidationIssue({
                        ruleId: 'ds18b20-power-check',
                        severity: 'warn',
                        message: `⚠️ [DS18B20 ${component.id}] GND pin not connected.`,
                        compIds: [component.id],
                        remediation: 'Connect GND to the common ground rail.',
                        autoFix: true,
                    }));
                }
                return issues.length > 0 ? issues : null;
            },
        },
        {
            id: 'ds18b20-data-check',
            name: 'DS18B20 Data Pin Check',
            severity: 'warn',
            priority: 20,
            description: 'Warn when DQ pin is disconnected.',
            check: (component: any, graph: Map<string, string[]>) => {
                const dq = graph.get(`${component.id}.DQ`) || [];
                if (dq.length === 0) {
                    return createValidationIssue({
                        ruleId: 'ds18b20-data-check',
                        severity: 'warn',
                        message: `⚠️ [DS18B20 ${component.id}] DQ (data) pin not connected. Connect to a digital pin.`,
                        compIds: [component.id],
                        remediation: 'Connect the DQ pin to an MCU digital pin.',
                        autoFix: true,
                    });
                }
                return null;
            },
        },
        {
            id: 'ds18b20-pullup-check',
            name: 'DS18B20 Pull-up Resistor Check',
            severity: 'info',
            priority: 30,
            description: 'Check for pull-up resistor on DQ line.',
            check: (component: any, graph: Map<string, string[]>) => {
                const dq = graph.get(`${component.id}.DQ`) || [];
                const hasResistor = dq.some((c: string) => c.includes('openhw-resistor'));
                if (!hasResistor && dq.length > 0) {
                    return createValidationIssue({
                        ruleId: 'ds18b20-pullup-check',
                        severity: 'info',
                        message: `ℹ️ [DS18B20 ${component.id}] Note: Breakout board includes onboard pull-up. If using a bare sensor, ensure a 4.7kΩ pull-up resistor is present between DQ and VCC.`,
                        compIds: [component.id],
                        remediation: 'Verify pull-up resistor requirements.',
                        autoFix: false,
                    });
                }
                return null;
            },
        },
    ],
};
