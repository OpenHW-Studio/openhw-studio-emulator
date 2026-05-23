export const validation = {
    rules: [
        {
            name: 'ADXL345 Power Check',
            check: (component: any, graph: Map<string, string[]>) => {
                const vcc = graph.get(`${component.id}.VCC`);
                const gnd = graph.get(`${component.id}.GND`);
                if (!vcc || vcc.length === 0) return `⚠️ [ADXL345 ${component.id}] VCC not connected. Connect to 3V-5V.`;
                if (!gnd || gnd.length === 0) return `⚠️ [ADXL345 ${component.id}] GND not connected.`;
                return null;
            },
        },
        {
            name: 'ADXL345 I2C Check',
            check: (component: any, graph: Map<string, string[]>) => {
                const scl = graph.get(`${component.id}.SCL`);
                const sda = graph.get(`${component.id}.SDA`);
                if (!scl || scl.length === 0) return `⚠️ [ADXL345 ${component.id}] SCL not connected.`;
                if (!sda || sda.length === 0) return `⚠️ [ADXL345 ${component.id}] SDA not connected.`;
                return null;
            },
        },
        {
            name: 'ADXL345 CS Configuration Check',
            check: (component: any, graph: Map<string, string[]>) => {
                const cs = graph.get(`${component.id}.CS`);
                if (cs && cs.length > 0) {
                    const isGnd = cs.some(n => n.includes('GND'));
                    if (isGnd) {
                        return `⚠️ [ADXL345 ${component.id}] CS pin is connected to GND, which forces SPI mode. Connect to VCC or leave disconnected for I2C operation.`;
                    }
                }
                return null;
            },
        },
    ],
};
