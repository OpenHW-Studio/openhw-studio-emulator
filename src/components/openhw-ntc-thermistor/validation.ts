export const validation = {
    rules: [
        {
            name: 'NTC Module Power Check',
            check: (component: any, graph: Map<string, string[]>) => {
                const vcc = graph.get(`${component.id}.VCC`);
                const gnd = graph.get(`${component.id}.GND`);
                if (!vcc || vcc.length === 0) {
                    return `⚠️ [NTC Module ${component.id}] Power (VCC) is missing. Connect VCC to 5V or 3.3V.`;
                }
                if (!gnd || gnd.length === 0) {
                    return `⚠️ [NTC Module ${component.id}] Ground (GND) is missing. Connect GND to the common ground.`;
                }
                return null;
            }
        },
        {
            name: 'NTC Module Signal Check',
            check: (component: any, graph: Map<string, string[]>) => {
                const a0 = graph.get(`${component.id}.A0`);
                const d0 = graph.get(`${component.id}.D0`);
                if ((!a0 || a0.length === 0) && (!d0 || d0.length === 0)) {
                    return `⚠️ [NTC Module ${component.id}] No signal pins are connected. Connect A0 for analog reading or D0 for digital threshold.`;
                }
                return null;
            }
        }
    ],
};
