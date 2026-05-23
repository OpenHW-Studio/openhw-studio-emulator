import { createValidationIssue } from '../component-schema.js';
import type { ComponentValidationRule } from '../component-schema.js';

export const validation: { rules: ComponentValidationRule[] } = {
    rules: [
        {
            id: 'slideswitch-spdt-floating-check',
            name: 'SPDT Slide Switch Floating Connection Check',
            severity: 'warn',
            priority: 10,
            description: 'Warn when the switch common terminal or both switch outputs are disconnected.',
            check: (component: any, graph: Map<string, string[]>) => {
                const p1 = graph.get(`${component.id}.1`);
                const pcom = graph.get(`${component.id}.COM`);
                const p2 = graph.get(`${component.id}.2`);

                const p1Connected = p1 && p1.length > 0;
                const pcomConnected = pcom && pcom.length > 0;
                const p2Connected = p2 && p2.length > 0;

                if (!p1Connected && !pcomConnected && !p2Connected) {
                    return createValidationIssue({
                        ruleId: 'slideswitch-spdt-floating-check',
                        severity: 'warn',
                        message: `⚠️ [SPDT Switch ${component.id}] Warning: Switch is completely disconnected.`,
                        compIds: [component.id],
                        remediation: 'Connect wires to the switch terminals (COM and at least one of 1 or 2).',
                        autoFix: true,
                    });
                }

                if (!pcomConnected) {
                    return createValidationIssue({
                        ruleId: 'slideswitch-spdt-floating-check',
                        severity: 'warn',
                        message: `⚠️ [SPDT Switch ${component.id}] Warning: Common terminal (COM) is not connected. The switch will not route any signal.`,
                        compIds: [component.id],
                        remediation: 'Connect the middle pin (COM) to your input signal, VCC, or GND.',
                        autoFix: false,
                    });
                }

                if (!p1Connected && !p2Connected) {
                    return createValidationIssue({
                        ruleId: 'slideswitch-spdt-floating-check',
                        severity: 'warn',
                        message: `⚠️ [SPDT Switch ${component.id}] Warning: Neither output terminal (1 or 2) is connected.`,
                        compIds: [component.id],
                        remediation: 'Connect at least one output terminal (1 or 2) to complete the circuit path.',
                        autoFix: false,
                    });
                }

                return null;
            }
        }
    ]
};
