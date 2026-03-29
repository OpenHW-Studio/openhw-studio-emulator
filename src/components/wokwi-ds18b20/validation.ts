export const validation = {
    rules: [
        {
            name: 'DS18B20 Power Check',
            check: (component: any, graph: Map<string, string[]>) => {
                const vdd = graph.get(`${component.id}.VDD`);
                const gnd = graph.get(`${component.id}.GND`);

                if (!vdd || vdd.length === 0) {
                    return `⚠️ [DS18B20 ${component.id}] VDD pin not connected. Connect to 3.3V or 5V.`;
                }
                if (!gnd || gnd.length === 0) {
                    return `⚠️ [DS18B20 ${component.id}] GND pin not connected.`;
                }
                return null;
            },
        },
        {
            name: 'DS18B20 Data Pin Check',
            check: (component: any, graph: Map<string, string[]>) => {
                const dq = graph.get(`${component.id}.DQ`);
                if (!dq || dq.length === 0) {
                    return `⚠️ [DS18B20 ${component.id}] DQ (data) pin not connected. Connect to a digital pin and use the OneWire + DallasTemperature library.`;
                }
                return null;
            },
        },
        {
            name: 'DS18B20 Pull-up Resistor Check',
            check: (component: any, graph: Map<string, string[]>) => {
                const dq = graph.get(`${component.id}.DQ`) || [];
                const hasResistor = dq.some((c: string) => c.includes('wokwi-resistor'));
                if (!hasResistor) {
                    return `⚠️ [DS18B20 ${component.id}] DQ pin requires a 4.7kΩ pull-up resistor to VCC for reliable 1-Wire communication.`;
                }
                return null;
            },
        },
    ],
};
