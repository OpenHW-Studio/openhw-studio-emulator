import { createValidationIssue } from '../component-schema.js';
import type { ComponentValidationRule } from '../component-schema.js';

export const validation: { rules: ComponentValidationRule[] } = {
    rules: [
        {
            id: 'potentiometer-power-dissipation',
            name: 'Potentiometer Power Dissipation',
            severity: 'error',
            priority: 10,
            description: 'Detect when the potentiometer track would overheat.',
            check: (component: any, graph: Map<string, string[]>, validator: any) => {
                const maxPower = 0.25;
                const rawVal = Number(component?.attrs?.value);
                const trackResistance = (Number.isFinite(rawVal) && rawVal > 100) ? rawVal : 10000;

                const vPin1 = validator?.calculateVoltageAtNode(`${component.id}.1`) ?? validator?.calculateVoltageAtNode(`${component.id}.GND`);
                const vPin2 = validator?.calculateVoltageAtNode(`${component.id}.2`) ?? validator?.calculateVoltageAtNode(`${component.id}.VCC`);

                if (vPin1 !== undefined && vPin1 !== null && vPin2 !== undefined && vPin2 !== null) {
                    const voltageDrop = Math.abs(vPin1 - vPin2);
                    const steadyStatePower = (voltageDrop ** 2) / trackResistance;

                    if (steadyStatePower > maxPower) {
                        return createValidationIssue({
                            ruleId: 'potentiometer-power-dissipation',
                            severity: 'error',
                            message: `🔥 [Potentiometer ${component.id}] Track dissipates ${steadyStatePower.toFixed(2)}W. Use a higher resistance potentiometer or lower supply voltage.`,
                            compIds: [component.id],
                            remediation: 'Use a potentiometer with higher track resistance or reduce supply voltage.',
                            autoFix: false,
                        });
                    }
                }

                return null;
            }
        },
        {
            id: 'potentiometer-floating-wiper',
            name: 'Floating Potentiometer Wiper',
            severity: 'warn',
            priority: 5,
            description: 'Detect when the wiper pin is not connected.',
            check: (component: any, graph: Map<string, string[]>) => {
                const wiperNode = `${component.id}.SIG`;
                const connections = graph.get(wiperNode) || [];

                if (connections.length === 0) {
                    return createValidationIssue({
                        ruleId: 'potentiometer-floating-wiper',
                        severity: 'warn',
                        message: `[Potentiometer ${component.id}] Wiper (pin 2) is not connected. It won't provide any signal to your MCU.`,
                        compIds: [component.id],
                        remediation: 'Connect the wiper to an Analog input pin.',
                        autoFix: true,
                    });
                }

                return null;
            }
        }
    ]
};
