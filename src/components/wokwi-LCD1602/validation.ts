export const validation = {
    rules: [
        {
            name: "LCD Power Connection Check",
            check: (component: any, graph: Map<string, string[]>) => {
                // Check if power pins are properly connected
                const vssConnected = graph.get(`${component.id}.VSS`);
                const vddConnected = graph.get(`${component.id}.VDD`);
                
                if (!vssConnected || vssConnected.length === 0) {
                    return `⚠️ [LCD ${component.id}] Warning: VSS (Ground) pin is not connected. LCD won't function without ground.`;
                }
                
                if (!vddConnected || vddConnected.length === 0) {
                    return `⚠️ [LCD ${component.id}] Warning: VDD (Power) pin is not connected. LCD won't function without power.`;
                }
                
                // Check if VDD is connected to appropriate power source
                const hasPower = vddConnected.some(conn => conn.includes('5V') || conn.includes('3.3V'));
                if (!hasPower) {
                    return `⚠️ [LCD ${component.id}] Warning: VDD should be connected to 5V or 3.3V power source.`;
                }
                
                const hasGround = vssConnected.some(conn => conn.includes('GND'));
                if (!hasGround) {
                    return `⚠️ [LCD ${component.id}] Warning: VSS should be connected to ground.`;
                }
                
                return null;
            }
        },
        {
            name: "LCD Control Pin Check",
            check: (component: any, graph: Map<string, string[]>) => {
                // Check if essential control pins are connected
                const rsConnected = graph.get(`${component.id}.RS`);
                const enableConnected = graph.get(`${component.id}.E`);
                
                if (!rsConnected || rsConnected.length === 0) {
                    return `⚠️ [LCD ${component.id}] Warning: RS (Register Select) pin is not connected. LCD won't receive commands/data properly.`;
                }
                
                if (!enableConnected || enableConnected.length === 0) {
                    return `⚠️ [LCD ${component.id}] Warning: E (Enable) pin is not connected. LCD won't process commands/data.`;
                }
                
                return null;
            }
        },
        {
            name: "LCD Data Pin Check",
            check: (component: any, graph: Map<string, string[]>) => {
                // Check if data pins are connected
                const connectedDataPins = [];
                const disconnectedDataPins = [];
                
                for (let i = 0; i < 8; i++) {
                    const pinConnections = graph.get(`${component.id}.D${i}`);
                    if (pinConnections && pinConnections.length > 0) {
                        connectedDataPins.push(`D${i}`);
                    } else {
                        disconnectedDataPins.push(`D${i}`);
                    }
                }
                
                if (connectedDataPins.length === 0) {
                    return `⚠️ [LCD ${component.id}] Warning: No data pins (D0-D7) are connected. LCD won't receive any data.`;
                }
                
                if (connectedDataPins.length < 4) {
                    return `⚠️ [LCD ${component.id}] Warning: Only ${connectedDataPins.length} data pin(s) connected. Consider using at least 4-bit mode (D4-D7).`;
                }
                
                if (disconnectedDataPins.length > 0) {
                    return `ℹ️ [LCD ${component.id}] Info: Data pins not connected: ${disconnectedDataPins.join(', ')}. Using ${connectedDataPins.length}-bit mode.`;
                }
                
                return null;
            }
        },
        {
            name: "LCD Backlight Check",
            check: (component: any, graph: Map<string, string[]>) => {
                // Check backlight connections
                const anodeConnected = graph.get(`${component.id}.A`);
                const cathodeConnected = graph.get(`${component.id}.K`);
                
                if (!anodeConnected || anodeConnected.length === 0) {
                    return `ℹ️ [LCD ${component.id}] Info: Backlight anode (A) pin not connected. Backlight won't work.`;
                }
                
                if (!cathodeConnected || cathodeConnected.length === 0) {
                    return `ℹ️ [LCD ${component.id}] Info: Backlight cathode (K) pin not connected. Backlight won't work.`;
                }
                
                // Check for proper backlight power configuration
                const hasBacklightPower = anodeConnected.some(conn => conn.includes('5V') || conn.includes('3.3V'));
                const hasBacklightGround = cathodeConnected.some(conn => conn.includes('GND'));
                
                if (!hasBacklightPower && !hasBacklightGround) {
                    return `⚠️ [LCD ${component.id}] Warning: Backlight pins should be connected to power (A) and ground (K).`;
                }
                
                return null;
            }
        },
        {
            name: "LCD Contrast Control Check",
            check: (component: any, graph: Map<string, string[]>) => {
                // Check contrast control pin
                const v0Connected = graph.get(`${component.id}.V0`);
                
                if (!v0Connected || v0Connected.length === 0) {
                    return `ℹ️ [LCD ${component.id}] Info: V0 (Contrast) pin not connected. Display may be too dark or too light. Connect to potentiometer for adjustable contrast.`;
                }
                
                // Check if connected to potentiometer
                const hasPotentiometer = v0Connected.some(conn => conn.includes('potentiometer') || conn.includes('pot'));
                if (!hasPotentiometer) {
                    return `ℹ️ [LCD ${component.id}] Info: V0 should be connected to a potentiometer for adjustable contrast.`;
                }
                
                return null;
            }
        }
    ]
};