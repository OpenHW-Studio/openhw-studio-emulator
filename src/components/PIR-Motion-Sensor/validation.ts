export const validation = {
    rules: [
        {
            name: "PIR Connections Check",
            check: (component: any, graph: Map<string, string[]>) => {
                const outPin = graph.get(`${component.id}.OUT`);
                const vccPin = graph.get(`${component.id}.VCC`);
                const gndPin = graph.get(`${component.id}.GND`);
                
                if (!outPin || outPin.length === 0) {
                    return `⚠️ [PIR ${component.id}] Warning: OUT pin is disconnected. Motion events will not be captured.`;
                }
                if (!vccPin || vccPin.length === 0) {
                    return `⚠️ [PIR ${component.id}] Warning: VCC pin is disconnected.`;
                }
                if (!gndPin || gndPin.length === 0) {
                    return `⚠️ [PIR ${component.id}] Warning: GND pin is disconnected.`;
                }
                
                return null;
            }
        }
    ]
};
