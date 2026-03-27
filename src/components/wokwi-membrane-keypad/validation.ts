export const validation = {
    rules: [
        {
            name: "Keypad Connection Check",
            check: (component: any, graph: Map<string, string[]>) => {
                // Check if keypad pins are properly connected
                const rowPins = ['R1', 'R2', 'R3', 'R4'];
                const colPins = ['C1', 'C2', 'C3', 'C4'];
                
                let connectedRows = 0;
                let connectedCols = 0;
                
                for (const pin of rowPins) {
                    const connections = graph.get(`${component.id}.${pin}`);
                    if (connections && connections.length > 0) {
                        connectedRows++;
                    }
                }
                
                for (const pin of colPins) {
                    const connections = graph.get(`${component.id}.${pin}`);
                    if (connections && connections.length > 0) {
                        connectedCols++;
                    }
                }
                
                if (connectedRows === 0 && connectedCols === 0) {
                    return `⚠️ [Keypad ${component.id}] Warning: No pins are connected. Keypad won't function without proper row/column connections.`;
                }
                
                if (connectedRows === 0) {
                    return `⚠️ [Keypad ${component.id}] Warning: No row pins (R1-R4) are connected.`;
                }
                
                if (connectedCols === 0) {
                    return `⚠️ [Keypad ${component.id}] Warning: No column pins (C1-C4) are connected.`;
                }
                
                return null;
            }
        },
        {
            name: "Keypad Short Circuit Check",
            check: (component: any, graph: Map<string, string[]>) => {
                // Check for potential short circuits between row pins or column pins
                const rowPins = ['R1', 'R2', 'R3', 'R4'];
                const colPins = ['C1', 'C2', 'C3', 'C4'];
                
                // Check if multiple row pins are connected together
                const rowConnections = new Map<string, string[]>();
                for (const pin of rowPins) {
                    const connections = graph.get(`${component.id}.${pin}`) || [];
                    rowConnections.set(pin, connections);
                }
                
                // Simple check: if any two row pins share the same connection point
                for (let i = 0; i < rowPins.length; i++) {
                    for (let j = i + 1; j < rowPins.length; j++) {
                        const conn1 = rowConnections.get(rowPins[i]) || [];
                        const conn2 = rowConnections.get(rowPins[j]) || [];
                        
                        if (conn1.length > 0 && conn2.length > 0) {
                            const hasCommon = conn1.some(c1 => conn2.includes(c1));
                            if (hasCommon) {
                                return `⚠️ [Keypad ${component.id}] Warning: Row pins ${rowPins[i]} and ${rowPins[j]} appear to be shorted together.`;
                            }
                        }
                    }
                }
                
                return null;
            }
        }
    ]
};