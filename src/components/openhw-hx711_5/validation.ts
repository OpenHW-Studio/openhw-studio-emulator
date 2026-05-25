export const validation = {
    rules: [
        {
            id: "hx711-power-missing",
            severity: "error",
            check: (component: any, connections: any) => {
                const vccConnected = connections.some((c: any) => c.pinId === "VCC");
                const gndConnected = connections.some((c: any) => c.pinId === "GND");
                if (!vccConnected || !gndConnected) {
                    return "HX711 requires both VCC and GND to be connected.";
                }
                return null;
            }
        },
        {
            id: "hx711-data-missing",
            severity: "error",
            check: (component: any, connections: any) => {
                const dtConnected = connections.some((c: any) => c.pinId === "DT");
                const sckConnected = connections.some((c: any) => c.pinId === "SCK");
                if (!dtConnected || !sckConnected) {
                    return "HX711 requires both DT and SCK pins to be connected for data transmission.";
                }
                return null;
            }
        }
    ]
};
