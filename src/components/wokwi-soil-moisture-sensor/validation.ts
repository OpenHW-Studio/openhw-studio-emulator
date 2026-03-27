export const validation = [
    {
        type: 'missing-connection',
        check: (comp: any, wires: any[]) => {
            const connectedPins = wires.flatMap(w => [w.from, w.to]);
            const hasVCC = connectedPins.includes(`${comp.id}:VCC`);
            const hasGND = connectedPins.includes(`${comp.id}:GND`);
            const hasSIG = connectedPins.includes(`${comp.id}:SIG`);

            if (!hasVCC || !hasGND) {
                return `Soil Moisture Sensor ${comp.id} requires VCC and GND connections to function`;
            }
            if (!hasSIG) {
                return `Soil Moisture Sensor ${comp.id} has no SIG pin connected`;
            }
            return null;
        }
    }
];
