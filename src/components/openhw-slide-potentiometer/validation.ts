import { createValidationIssue } from '../component-schema.js';
import type { ComponentValidationRule } from '../component-schema.js';

export const validation: { rules: ComponentValidationRule[] } = {
    rules: [
        {
            id: 'slide-potentiometer-power-dissipation',
            name: 'Slide Potentiometer Power Dissipation',
            severity: 'error',
            priority: 10,
            description: 'Detect when the slide potentiometer track would overheat.',
            check: (component: any, graph: Map<string, string[]>, validator: any) => {
                const maxPower = 0.25;
                // Typical potentiometer track resistance (10kΩ). VCC-to-GND always has this
                // full value regardless of wiper position, so a short between supply rails
                // through a properly working potentiometer is physically impossible.
                const trackResistance = 10000;
                const vVCC = validator?.calculateVoltageAtNode(`${component.id}.VCC`);
                const vGND = validator?.calculateVoltageAtNode(`${component.id}.GND`);

                if (vVCC !== undefined && vGND !== undefined) {
                    const voltageDrop = Math.abs(vVCC - vGND);
                    const steadyStatePower = (voltageDrop ** 2) / trackResistance;

                    if (steadyStatePower > maxPower) {
                        return createValidationIssue({
                            ruleId: 'slide-potentiometer-power-dissipation',
                            severity: 'error',
                            message: `🔥 [Slide Pot ${component.id}] Track dissipates ${steadyStatePower.toFixed(2)}W. Use higher resistance pot or lower voltage.`,
                            compIds: [component.id],
                            remediation: 'Use a potentiometer with higher track resistance or reduce supply voltage.',
                            autoFix: false,
                        });
                    }
                }

                return null;
            }
        }
    ]
};
