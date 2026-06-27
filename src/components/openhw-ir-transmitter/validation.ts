import { createValidationIssue } from '../component-schema.js';
import type { ComponentValidationRule } from '../component-schema.js';

export const validation: { rules: ComponentValidationRule[] } = {
    rules: [
        {
            id: 'ir-transmitter-power-check',
            name: 'IR Transmitter Power Check',
            severity: 'warn',
            priority: 10,
            description: 'Warn when VCC or GND pins are disconnected.',
            check: (component: any, graph: Map<string, string[]>) => {
                const vcc = graph.get(`${component.id}.VCC`) || [];
                const gnd = graph.get(`${component.id}.GND`) || [];
                const issues = [];

                if (vcc.length === 0) {
                    issues.push(createValidationIssue({
                        ruleId: 'ir-transmitter-power-check',
                        severity: 'warn',
                        message: `⚠️ [IR Transmitter ${component.id}] VCC not connected. Connect to 3.3V or 5V.`,
                        compIds: [component.id],
                        remediation: 'Connect VCC to the power rail.',
                        autoFix: true,
                    }));
                }
                if (gnd.length === 0) {
                    issues.push(createValidationIssue({
                        ruleId: 'ir-transmitter-power-check',
                        severity: 'warn',
                        message: `⚠️ [IR Transmitter ${component.id}] GND not connected.`,
                        compIds: [component.id],
                        remediation: 'Connect GND to the common ground rail.',
                        autoFix: true,
                    }));
                }
                return issues.length > 0 ? issues : null;
            },
        },
        {
            id: 'ir-transmitter-out-check',
            name: 'IR Transmitter Output Pin Check',
            severity: 'warn',
            priority: 20,
            description: 'Warn when OUT pin is disconnected.',
            check: (component: any, graph: Map<string, string[]>) => {
                const out = graph.get(`${component.id}.OUT`) || [];
                if (out.length === 0) {
                    return createValidationIssue({
                        ruleId: 'ir-transmitter-out-check',
                        severity: 'warn',
                        message: `⚠️ [IR Transmitter ${component.id}] OUT pin not connected. Connect to a digital pin.`,
                        compIds: [component.id],
                        remediation: 'Connect the OUT pin to an MCU digital pin or leave unconnected for wireless-only operation.',
                        autoFix: false,
                    });
                }
                return null;
            },
        },
    ],
};
