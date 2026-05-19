import { createValidationIssue } from '../component-schema.js';
import type { ComponentValidationRule } from '../component-schema.js';

export const validation: { rules: ComponentValidationRule[] } = {
    rules: [
        {
            id: 'ir-receiver-power-check',
            name: 'IR Receiver Power Check',
            severity: 'warn',
            priority: 10,
            description: 'Warn when VCC or GND pins are disconnected.',
            check: (component: any, graph: Map<string, string[]>) => {
                const vcc = graph.get(`${component.id}.VCC`) || [];
                const gnd = graph.get(`${component.id}.GND`) || [];
                const issues = [];

                if (vcc.length === 0) {
                    issues.push(createValidationIssue({
                        ruleId: 'ir-receiver-power-check',
                        severity: 'warn',
                        message: `⚠️ [IR Receiver ${component.id}] VCC not connected. Connect to 3.3V or 5V.`,
                        compIds: [component.id],
                        remediation: 'Connect VCC to the power rail.',
                        autoFix: true,
                    }));
                }
                if (gnd.length === 0) {
                    issues.push(createValidationIssue({
                        ruleId: 'ir-receiver-power-check',
                        severity: 'warn',
                        message: `⚠️ [IR Receiver ${component.id}] GND not connected.`,
                        compIds: [component.id],
                        remediation: 'Connect GND to the common ground rail.',
                        autoFix: true,
                    }));
                }
                return issues.length > 0 ? issues : null;
            },
        },
        {
            id: 'ir-receiver-out-check',
            name: 'IR Receiver Output Pin Check',
            severity: 'warn',
            priority: 20,
            description: 'Warn when OUT pin is disconnected.',
            check: (component: any, graph: Map<string, string[]>) => {
                const out = graph.get(`${component.id}.OUT`) || [];
                if (out.length === 0) {
                    return createValidationIssue({
                        ruleId: 'ir-receiver-out-check',
                        severity: 'warn',
                        message: `⚠️ [IR Receiver ${component.id}] OUT pin not connected. Connect to a digital pin.`,
                        compIds: [component.id],
                        remediation: 'Connect the OUT pin to an MCU digital pin.',
                        autoFix: true,
                    });
                }
                return null;
            },
        },
        {
            id: 'ir-receiver-digital-check',
            name: 'IR Receiver Digital Pin Check',
            severity: 'warn',
            priority: 30,
            description: 'Ensure OUT pin connects to a digital-capable pin.',
            check: (component: any, graph: Map<string, string[]>) => {
                const out = graph.get(`${component.id}.OUT`) || [];
                const hasDigital = out.some((c: string) =>
                    !c.includes(':A0') && !c.includes(':A1') &&
                    !c.includes(':A2') && !c.includes(':A3')
                );
                if (out.length > 0 && !hasDigital) {
                    return createValidationIssue({
                        ruleId: 'ir-receiver-digital-check',
                        severity: 'warn',
                        message: `⚠️ [IR Receiver ${component.id}] OUT should connect to a digital pin (e.g. D2–D13), not an analog-only pin.`,
                        compIds: [component.id],
                        remediation: 'Move OUT connection to a digital pin.',
                        autoFix: false,
                    });
                }
                return null;
            },
        },
    ],
};
