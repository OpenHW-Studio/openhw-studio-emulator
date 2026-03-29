export const validation = {
    rules: [
        {
            name: 'MFRC522 Voltage Check',
            check: (component: any, graph: Map<string, string[]>) => {
                const vcc = graph.get(`${component.id}.VCC`);
                if (!vcc || vcc.length === 0)
                    return `⚠️ [MFRC522 ${component.id}] VCC not connected. IMPORTANT: Use 3.3V only — 5V will damage the chip!`;
                const connectedTo5V = vcc.some((c: string) => c.includes('5V') || c.includes('VIN'));
                if (connectedTo5V)
                    return `🔴 [MFRC522 ${component.id}] VCC appears connected to 5V. This WILL damage the MFRC522. Use 3.3V only!`;
                return null;
            },
        },
        {
            name: 'MFRC522 SPI Check',
            check: (component: any, graph: Map<string, string[]>) => {
                const pins = ['MISO', 'MOSI', 'SCK', 'SDA'];
                for (const pin of pins) {
                    const conn = graph.get(`${component.id}.${pin}`);
                    if (!conn || conn.length === 0)
                        return `⚠️ [MFRC522 ${component.id}] ${pin} pin not connected. All SPI pins (MISO=D12, MOSI=D11, SCK=D13, SDA=D10) must be connected.`;
                }
                return null;
            },
        },
    ],
};
