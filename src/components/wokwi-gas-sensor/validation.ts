export const validation = [
    {
        type: 'missing-connection',
        check: (comp: any, wires: any[]) => {
            const connectedPins = wires.flatMap(w => [w.from, w.to]);
            const hasVCC = connectedPins.includes(`${comp.id}:VCC`);
            const hasGND = connectedPins.includes(`${comp.id}:GND`);
            const hasOut = connectedPins.includes(`${comp.id}:DO`) || connectedPins.includes(`${comp.id}:AO`);

            if (!hasVCC || !hasGND) {
                return `Gas Sensor ${comp.id} requires VCC and GND connections to function`;
            }
            if (!hasOut) {
                return `Gas Sensor ${comp.id} has no output pins (DO or AO) connected`;
            }
            return null;
        }
    }
];
