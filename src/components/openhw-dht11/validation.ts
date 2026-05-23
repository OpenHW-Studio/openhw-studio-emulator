import { createValidationIssue } from '../component-schema.js';
import type { ComponentValidationRule } from '../component-schema.js';

export const validation: { rules: ComponentValidationRule[] } = {
    rules: [
        {
            id: 'dht11-power-check',
            name: 'DHT11 Power Connection Check',
            severity: 'error',
            priority: 10,
            description: 'Ensure DHT11 VCC and GND pins are connected.',
            check: (component: any, graph: Map<string, string[]>) => {
                const vcc = graph.get(`${component.id}.VCC`);
                const gnd = graph.get(`${component.id}.GND`);

                if (!vcc || vcc.length === 0 || !gnd || gnd.length === 0) {
                    return createValidationIssue({
                        ruleId: 'dht11-power-check',
                        severity: 'error',
                        message: `❌ [DHT11 ${component.id}] Error: VCC and GND pins must be connected to power the sensor.`,
                        compIds: [component.id],
                        remediation: 'Connect VCC to 5V/3.3V and GND to ground.',
                        autoFix: true,
                    });
                }
                return null;
            }
        },
        {
            id: 'dht11-data-check',
            name: 'DHT11 Data Connection Check',
            severity: 'warn',
            priority: 10,
            description: 'Ensure DHT11 DATA pin is connected.',
            check: (component: any, graph: Map<string, string[]>) => {
                const data = graph.get(`${component.id}.DATA`);
                
                if (!data || data.length === 0) {
                    return createValidationIssue({
                        ruleId: 'dht11-data-check',
                        severity: 'warn',
                        message: `⚠️ [DHT11 ${component.id}] Warning: DATA pin is unconnected.`,
                        compIds: [component.id],
                        remediation: 'Connect DATA to a digital pin on the microcontroller.',
                        autoFix: true,
                    });
                }
                return null;
            }
        }
    ]
};
