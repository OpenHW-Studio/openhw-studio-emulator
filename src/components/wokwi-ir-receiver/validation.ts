export const validation = {
    rules: [
        {
            name: 'IR Receiver Power Check',
            check: (component: any, graph: Map<string, string[]>) => {
                const vcc = graph.get(`${component.id}.VCC`);
                const gnd = graph.get(`${component.id}.GND`);
                if (!vcc || vcc.length === 0)
                    return `⚠️ [IR Receiver ${component.id}] VCC not connected. Connect to 3.3V or 5V.`;
                if (!gnd || gnd.length === 0)
                    return `⚠️ [IR Receiver ${component.id}] GND not connected.`;
                return null;
            },
        },
        {
            name: 'IR Receiver Output Pin Check',
            check: (component: any, graph: Map<string, string[]>) => {
                const out = graph.get(`${component.id}.OUT`);
                if (!out || out.length === 0)
                    return `⚠️ [IR Receiver ${component.id}] OUT pin not connected. Connect to a digital pin and use the IRremote library with enableIRIn().`;
                return null;
            },
        },
        {
            name: 'IR Receiver Digital Pin Check',
            check: (component: any, graph: Map<string, string[]>) => {
                const out = graph.get(`${component.id}.OUT`) || [];
                const hasDigital = out.some((c: string) =>
                    // Must NOT be connected to an analog-only pin
                    !c.includes(':A0') && !c.includes(':A1') &&
                    !c.includes(':A2') && !c.includes(':A3')
                );
                if (out.length > 0 && !hasDigital)
                    return `⚠️ [IR Receiver ${component.id}] OUT should connect to a digital pin (e.g. D2–D13), not an analog-only pin.`;
                return null;
            },
        },
    ],
};
