import { createValidationIssue } from '../component-schema.js';
import type { ComponentValidationRule } from '../component-schema.js';

export const validation: { rules: ComponentValidationRule[] } = {
    rules: [
        {
            id: 'dht22-connection-check',
            name: 'DHT22 Connection Check',
            severity: 'warn',
            priority: 10,
            description: 'Warn when DHT22 pins are disconnected.',
            check: (component: any, graph: Map<string, string[]>, validator: any) => {
                const requiredPins = ['VCC', 'GND', 'DATA'];
                const missingPins = requiredPins.filter(pin => {
                    const node = `${component.id}.${pin}`;
                    return validator.getNeighbors(node).length === 0;
                });

                if (missingPins.length > 0) {
                    return createValidationIssue({
                        ruleId: 'dht22-connection-check',
                        severity: 'warn',
                        message: `⚠️ [DHT22 ${component.id}] Pin Warning: The following pins are not connected: ${missingPins.join(', ')}. DHT22 sensor requires VCC, GND, and DATA pins to be fully wired.`,
                        compIds: [component.id],
                        remediation: 'Connect all DHT22 pins.',
                        autoFix: true,
                    });
                }

                return null;
            }
        }
    ]
};
